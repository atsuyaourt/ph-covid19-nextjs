import React from 'react'
import PropTypes from 'prop-types'
import * as Realm from 'realm-web'
import axios from 'axios'

// eslint-disable-next-line no-unused-vars
import PH_PROV_GJSON from './data/ph/province.geojson'

const RealmAppContext = React.createContext()

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

  const fetchData = async (fetchDate, healthStatus) => {
    const casesCol = currentUser.mongoClient('mongodb-atlas').db('default').collection('cases')

    let matchCond = {
      deletedAt: {
        $exists: 0,
      },
      dateRepConf: new Date(`${toISODateString(fetchDate)}T00:00:00.000+08:00`),
    }

    if (healthStatus) matchCond = { ...matchCond, healthStatus }

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
      .get(PH_PROV_GJSON)
      .then((response) => response.data)
      .catch((error) => error)

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

  const toISODateString = (date) => {
    const dayStr = String(date.getUTCDate()).padStart(2, '0')
    const monStr = String(date.getUTCMonth()).padStart(2, '0')
    return `${date.getUTCFullYear()}-${monStr}-${dayStr}`
  }

  const wrapped = { ...app, currentUser, logIn, logOut, loginAnonymous, loginApiKey, fetchData }
  return <RealmAppContext.Provider value={wrapped}>{children}</RealmAppContext.Provider>
}

RealmAppProvider.propTypes = {
  appId: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
}
