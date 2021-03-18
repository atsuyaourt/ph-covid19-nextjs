import React from 'react'
import PropTypes from 'prop-types'
import { useRealmApp, RealmAppProvider } from './RealmApp'

import { Mapbox } from './components/Mapbox'

import logo from './logo.svg' // eslint-disable-line no-unused-vars

const REALM_APP_ID = process.env.REACT_APP_REALM_ID
const REALM_API_KEY = process.env.REACT_APP_REALM_API_KEY

const RequireLoggedInUser = ({ children }) => {
  // Only render children if there is a logged in user.
  const app = useRealmApp()
  return app.currentUser ? children : app.loginApiKey(REALM_API_KEY)
}
RequireLoggedInUser.propTypes = {
  children: PropTypes.node.isRequired,
}

function App() {
  return (
    <RealmAppProvider appId={REALM_APP_ID}>
      <RequireLoggedInUser>
        <Mapbox />
      </RequireLoggedInUser>
    </RealmAppProvider>
  )
}

export default App
