import React from 'react'
import PropTypes from 'prop-types'
import * as Realm from 'realm-web'
import axios from 'axios'
import { format as dateFormat } from 'date-fns'

// eslint-disable-next-line no-unused-vars
import PH_PROV_GEOJSON from './data/ph/province.geojson'

const RealmAppContext = React.createContext()

const EMPTY_GEOJSON = {
  type: 'FeatureCollection',
  features: [],
}

export const useRealmApp = () => {
  const app = React.useContext(RealmAppContext)
  if (!app) {
    throw new Error(`You must call useRealmApp() inside of a <RealmAppProvider />`)
  }
  return app
}

export const RealmAppProvider = ({ appId, children }) => {
  const [app, setApp] = React.useState(new Realm.App(appId))
  React.useEffect(() => {
    setApp(new Realm.App(appId))
  }, [appId])
  // Wrap the Realm.App object's user state with React state
  const [currentUser, setCurrentUser] = React.useState(app.currentUser)

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
    app.logIn(Realm.Credentials.anonymous())
    setCurrentUser(app.currentUser)
  }

  const loginApiKey = async (apiKey) => {
    // Create an API Key credential
    const credentials = Realm.Credentials.apiKey(apiKey)
    // Authenticate the user
    const user = await app.logIn(credentials)
    // `App.currentUser` updates to match the logged in user
    // assert(user.id === app.currentUser.id)
    return user
  }

  const fetchData = async ({ fetchDate, healthStatus }, mode) => {
    const casesCol = currentUser.mongoClient('mongodb-atlas').db('default').collection('cases')

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

    const groupId = {
      regionResGeo: '$regionResGeo',
      provResGeo: '$provResGeo',
    }

    const project = {
      regionResGeo: '$_id.regionResGeo',
      provResGeo: '$_id.provResGeo',
      count: { $size: '$uniqueId' },
      _id: 0,
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
              _id: groupId,
              uniqueId: { $addToSet: '$_id' },
            },
          },
          { $project: project },
        ])
        .catch((e) => console.log(e))) || []

    const phProvGeoJSON = await axios
      .get(PH_PROV_GEOJSON)
      .then((response) => response.data)
      .catch((e) => console.log(e))

    if (phProvGeoJSON) {
      caseCountGeoJSON = phProvGeoJSON.features.map((f, idx) => {
        const matchMapData = caseCountGeoJSON.filter(({ regionResGeo, provResGeo }) => {
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

  const wrapped = {
    ...app,
    currentUser,
    logIn,
    logOut,
    loginAnonymous,
    loginApiKey,
    fetchData,
    getDateRange,
  }
  return <RealmAppContext.Provider value={wrapped}>{children}</RealmAppContext.Provider>
}

RealmAppProvider.propTypes = {
  appId: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
}