import React, { useState, useContext } from 'react'
import PropTypes from 'prop-types'
import { App, Credentials } from 'realm-web'

const RealmAppContext = React.createContext()

const EMPTY_GEOJSON = {
  type: 'FeatureCollection',
  features: [],
}

// const activeStatEnum = ['asymptomatic', 'mild', 'moderate', 'severe', 'critical']

export const useRealmApp = () => {
  const app = useContext(RealmAppContext)
  if (!app) {
    throw new Error(`You must call useRealmApp() inside of a <RealmAppProvider />`)
  }
  return app
}

export const RealmAppProvider = ({ appId, children }) => {
  const [app, setApp] = useState(new App(appId))

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

  const fetchCountProv = async (healthStatus, prevData) => {
    const geomapsCol = currentUser
      .mongoClient('mongodb-atlas')
      .db('defaultDb')
      .collection('geomaps')

    let newData =
      (await currentUser.functions.countCasesProv(healthStatus).catch((e) => console.log(e))) || []

    if (prevData === undefined) {
      prevData =
        (await geomapsCol
          .findOne({ name: 'ph-prov' })
          .then((d) => d.geo)
          .catch((e) => console.log(e))) || []
    }

    if (prevData) {
      newData = prevData.features.map((f, idx) => {
        const matchData = newData.filter(({ _id }) => {
          if (_id !== null) {
            const [provResGeo, regionResGeo] = _id.split(',')
            return f.properties.region === regionResGeo && f.properties.province === provResGeo
          }
          return false
        })

        const { region, province } = f.properties

        if (matchData.length > 0) {
          let { count } = matchData[0]
          if (!Number.isInteger(count)) count = 0
          const newProp = { region, province, count }
          return { ...f, properties: newProp, id: idx }
        } else {
          const newProp = { region, province, count: 0 }
          return { ...f, properties: newProp, id: idx }
        }
      })

      newData = { ...prevData, features: newData }

      return newData
    }

    return EMPTY_GEOJSON
  }

  const wrapped = {
    ...app,
    currentUser,
    logIn,
    logOut,
    loginAnonymous,
    loginApiKey,
    fetchCountProv,
  }
  return <RealmAppContext.Provider value={wrapped}>{children}</RealmAppContext.Provider>
}

RealmAppProvider.propTypes = {
  appId: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
}
