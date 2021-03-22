import React, { useState, useContext } from 'react'
import PropTypes from 'prop-types'
import { App, Credentials } from 'realm-web'
import { format as dateFormat } from 'date-fns'

const RealmAppContext = React.createContext()

const EMPTY_GEOJSON = {
  type: 'FeatureCollection',
  features: [],
}

export const useRealmApp = () => {
  const app = useContext(RealmAppContext)
  if (!app) {
    throw new Error(`You must call useRealmApp() inside of a <RealmAppProvider />`)
  }
  return app
}

export const RealmAppProvider = ({ appId, children }) => {
  const [app, setApp] = useState(new App(appId))
  let phProvGeoJSON = null

  React.useEffect(() => {
    setApp(new App(appId))
  }, [appId])
  // Wrap the Realm.App object's user state with React state
  const [currentUser, setCurrentUser] = useState(app.currentUser)

  const logIn = async (credentials) => {
    await app.logIn(credentials)
    // If successful, app.currentUser is the user that just logged in
    setCurrentUser(app.currentUser)
  }

  const logOut = async () => {
    // Log out the currently active user
    await app.currentUser?.logOut()
    // If another user was logged in too, they're now the current user.
    // Otherwise, app.currentUser is null.
    setCurrentUser(app.currentUser)
  }

  const loginAnonymous = async () => {
    app.logIn(Credentials.anonymous())
    setCurrentUser(app.currentUser)
  }

  const loginApiKey = async (apiKey) => {
    // Create an API Key credential
    const credentials = Credentials.apiKey(apiKey)
    // Authenticate the user
    const user = await app.logIn(credentials)
    // `App.currentUser` updates to match the logged in user
    // assert(user.id === app.currentUser.id)
    return user
  }

  const fetchData = async ({ fetchDate, healthStatus }, mode) => {
    const mongodb = currentUser.mongoClient('mongodb-atlas').db('default')
    const casesCol = mongodb.collection('cases')
    const geomapsCol = mongodb.collection('geomaps')

    if (Object.prototype.toString.call(fetchDate) !== '[object Date]') return EMPTY_GEOJSON

    let dateCond = ''
    if (mode === 1) dateCond = new Date(`${dateFormat(fetchDate, 'yyyy-MM-dd')}T00:00:00.000+08:00`)
    else
      dateCond = {
        $lte: new Date(`${dateFormat(fetchDate, 'yyyy-MM-dd')}T00:00:00.000+08:00`),
      }

    let matchCond = {
      deletedAt: {
        $exists: 0,
      },
      regionResGeo: { $type: 'string' },
      provResGeo: { $type: 'string' },
    }

    switch (healthStatus) {
      case 'recovered':
        matchCond = {
          ...matchCond,
          dateRecover: dateCond,
          healthStatus,
        }
        break
      case 'died':
        matchCond = {
          ...matchCond,
          dateDied: dateCond,
          healthStatus,
        }
        break
      case 'asymptomatic':
      case 'mild':
      case 'severe':
      case 'critical':
        matchCond = {
          ...matchCond,
          dateRepConf: dateCond,
          healthStatus,
        }
        break
      case 'active':
        matchCond = {
          ...matchCond,
          dateRepConf: dateCond,
          healthStatus: { $in: ['asymptomatic', 'mild', 'severe', 'critical'] },
        }
        break
      default:
        matchCond = {
          ...matchCond,
          dateRepConf: dateCond,
        }
        break
    }

    let caseCountGeoJSON =
      (await casesCol
        .aggregate([
          {
            $match: matchCond,
          },
          { $sort: { createdAt: -1 } },
          {
            $group: {
              _id: '$caseCode',
              grpStr: {
                $first: {
                  $concat: ['$provResGeo', ',', '$regionResGeo'],
                },
              },
            },
          },
          {
            $group: {
              _id: '$grpStr',
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              regionResGeo: { $arrayElemAt: [{ $split: ['$_id', ','] }, 1] },
              provResGeo: { $arrayElemAt: [{ $split: ['$_id', ','] }, 0] },
              count: 1,
              _id: 0,
            },
          },
        ])
        .catch((e) => console.log(e))) || []

    if (phProvGeoJSON === null) {
      phProvGeoJSON = await geomapsCol.findOne({ name: 'ph-prov' }).then((d) => d.geo)
    }

    if (phProvGeoJSON) {
      caseCountGeoJSON = phProvGeoJSON.features.map((f, idx) => {
        const matchMapData = caseCountGeoJSON.filter(({ provResGeo, regionResGeo }) => {
          return f.properties.region === regionResGeo && f.properties.province === provResGeo
        })

        const { region, province } = f.properties

        if (matchMapData.length > 0) {
          let { count } = matchMapData[0]
          if (!Number.isInteger(count)) count = 0
          const newProp = { region, province, count }
          return { ...f, properties: newProp, id: idx }
        } else {
          const newProp = { region, province, count: 0 }
          return { ...f, properties: newProp, id: idx }
        }
      })

      caseCountGeoJSON = { ...phProvGeoJSON, features: caseCountGeoJSON }

      return caseCountGeoJSON
    }

    return EMPTY_GEOJSON
  }

  const getDateRange = () => {
    const casesCol = currentUser.mongoClient('mongodb-atlas').db('default').collection('cases')

    return casesCol
      .aggregate([
        {
          $match: {
            deletedAt: {
              $exists: 0,
            },
          },
        },
        {
          $group: {
            _id: null,
            minDate: { $min: '$dateRepConf' },
            maxDate: { $max: '$dateRepConf' },
          },
        },
        { $project: { _id: 0 } },
      ])
      .then((d) => d[0])
  }

  const fetchStats = () => {
    const mongodb = currentUser.mongoClient('mongodb-atlas').db('default')
    const casesCol = mongodb.collection('cases')

    const matchCond = {
      deletedAt: {
        $exists: 0,
      },
    }

    return casesCol.aggregate([
      {
        $match: matchCond,
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$caseCode',
          healthStatus: { $first: '$healthStatus' },
        },
      },
      { $group: { _id: '$healthStatus', count: { $sum: 1 } } },
      { $project: { healthStatus: '$_id', count: 1, _id: 0 } },
    ])
  }

  const wrapped = {
    ...app,
    currentUser,
    logIn,
    logOut,
    loginAnonymous,
    loginApiKey,
    fetchData,
    getDateRange,
    fetchStats,
  }
  return <RealmAppContext.Provider value={wrapped}>{children}</RealmAppContext.Provider>
}

RealmAppProvider.propTypes = {
  appId: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
}
