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

  const fetchData = async ({ fetchDate, healthStatus }) => {
    const casesCol = currentUser.mongoClient('mongodb-atlas').db('default').collection('cases')

    if (Object.prototype.toString.call(fetchDate) !== '[object Date]') return EMPTY_GEOJSON

    const datePHT = new Date(`${dateFormat(fetchDate, 'yyyy-MM-dd')}T00:00:00.000+08:00`)

    let matchCond = {
      deletedAt: {
        $exists: 0,
      },
      dateRepConf: datePHT,
    }

    switch (healthStatus) {
      case 'recovered':
        matchCond = {
          ...matchCond,
          dateRecover: datePHT,
          healthStatus,
        }
        break
      case 'died':
        matchCond = {
          ...matchCond,
          dateDied: datePHT,
          healthStatus,
        }
        break
      case 'asymptomatic':
      case 'mild':
      case 'severe':
      case 'critical':
        matchCond = {
          ...matchCond,
          dateRepConf: datePHT,
          healthStatus,
        }
        break
      case 'active':
        matchCond = {
          ...matchCond,
          dateRepConf: datePHT,
          healthStatus: { $in: ['asymptomatic', 'mild', 'severe', 'critical'] },
        }
        break
      default:
        matchCond = {
          ...matchCond,
          dateRepConf: datePHT,
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
      count: 1,
      _id: 0,
    }

    const caseCount =
      (await casesCol
        .aggregate([
          {
            $match: matchCond,
          },
          { $sort: { createdAt: -1 } },
          {
            $group: {
              _id: groupId,
              count: { $sum: 1 },
            },
          },
          { $project: project },
        ])
        .catch((e) => console.log(e))) || []

    const phCovidSrc = await axios
      .get(PH_PROV_GEOJSON)
      .then((response) => response.data)
      .catch((e) => console.log(e))

    if (phCovidSrc) {
      const { type: ftype, crs, features } = phCovidSrc

      let caseCountSrc = features.map(({ type: mtype, properties, geometry }, idx) => {
        const matchMapData = caseCount.filter(({ regionResGeo, provResGeo }) => {
          return properties.region === regionResGeo && properties.province === provResGeo
        })

        const { region, province } = properties

        if (matchMapData.length > 0) {
          return matchMapData.map((m) => {
            const { healthStatus, count } = m
            const newProp = { region, province, healthStatus, count }
            return { id: idx, type: mtype, properties: newProp, geometry }
          })
        } else {
          return { id: idx, type: mtype, properties: properties, geometry }
        }
      })

      caseCountSrc = { type: ftype, crs, features: [].concat(...caseCountSrc) }

      return caseCountSrc
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
