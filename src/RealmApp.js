import React, { useState, useContext } from 'react'
import PropTypes from 'prop-types'
import { App, Credentials } from 'realm-web'

const RealmAppContext = React.createContext()

const EMPTY_GEOJSON = {
  type: 'FeatureCollection',
  features: [],
}

const activeStatEnum = ['asymptomatic', 'mild', 'moderate', 'severe', 'critical']

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

  const fetchCountProv = async (healthStatus) => {
    const mongodb = currentUser.mongoClient('mongodb-atlas').db('default')
    const casesCol = mongodb.collection('cases')
    const geomapsCol = mongodb.collection('geomaps')

    let matchCond = {
      deletedAt: {
        $exists: 0,
      },
      regionResGeo: { $type: 'string' },
      provResGeo: { $type: 'string' },
    }

    if (healthStatus === 'active') {
      matchCond = {
        ...matchCond,
        healthStatus: { $in: activeStatEnum },
      }
    } else if (healthStatus === '') {
      matchCond = {
        ...matchCond,
      }
    } else {
      matchCond = {
        ...matchCond,
        healthStatus,
      }
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
        ])
        .catch((e) => console.log(e))) || []

    if (phProvGeoJSON === null) {
      phProvGeoJSON = await geomapsCol.findOne({ name: 'ph-prov' }).then((d) => d.geo)
    }

    if (phProvGeoJSON) {
      caseCountGeoJSON = phProvGeoJSON.features.map((f, idx) => {
        const matchMapData = caseCountGeoJSON.filter(({ _id }) => {
          const [provResGeo, regionResGeo] = _id.split(',')
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

  const fetchStats = async () => {
    const mongodb = currentUser.mongoClient('mongodb-atlas').db('default')
    const casesCol = mongodb.collection('cases')

    let totCase = await casesCol.aggregate([
      {
        $match: {
          deletedAt: {
            $exists: 0,
          },
        },
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
    let _active = totCase
      .filter((c) => activeStatEnum.includes(c.healthStatus))
      .map((o) => o.count)
      .reduce((a, b) => a + b, 0)
    totCase = totCase.reduce((o, { healthStatus, count }) => {
      o[healthStatus] = count
      return o
    }, {})
    totCase['active'] = _active

    const dateRange = await getDateRange()

    let newCase = await casesCol.aggregate([
      {
        $match: {
          deletedAt: {
            $exists: 0,
          },
          dateRepConf: dateRange.maxDate,
        },
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
    let _newActive = newCase
      .filter((c) =>
        ['asymptomatic', 'mild', 'moderate', 'severe', 'critical'].includes(c.healthStatus)
      )
      .map((o) => o.count)
      .reduce((a, b) => a + b, 0)
    newCase = newCase.reduce((o, { healthStatus, count }) => {
      o[healthStatus] = count
      return o
    }, {})
    newCase['active'] = _newActive

    return { totCase, newCase }
  }

  const wrapped = {
    ...app,
    currentUser,
    logIn,
    logOut,
    loginAnonymous,
    loginApiKey,
    fetchCountProv,
    getDateRange,
    fetchStats,
  }
  return <RealmAppContext.Provider value={wrapped}>{children}</RealmAppContext.Provider>
}

RealmAppProvider.propTypes = {
  appId: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
}
