import React, { useState, useContext, useEffect } from "react";
import PropTypes from "prop-types";
import { App, Credentials } from "realm-web";

const RealmAppContext = React.createContext();

const EMPTY_GEOJSON = {
  type: "FeatureCollection",
  features: []
};

// const activeStatEnum = ['asymptomatic', 'mild', 'moderate', 'severe', 'critical']

export const useRealmApp = () => {
  const app = useContext(RealmAppContext);
  if (!app) {
    throw new Error(
      `You must call useRealmApp() inside of a <RealmAppProvider />`
    );
  }
  return app;
};

export const RealmAppProvider = ({ appId, apiKey, children }) => {
  const app = new App(appId);
  const [currentUser, setCurrentUser] = useState(app.currentUser);

  useEffect(async () => {
    logIn();

    return () => logOut();
  }, [currentUser]);

  const logIn = async () => {
    const credentials = Credentials.apiKey(apiKey);
    const user = await app.logIn(credentials);
    setCurrentUser(user);
  };

  const logOut = async () => {
    const user = await currentUser.logOut();
    setCurrentUser(user);
  };

  const fetchStatsProv = async (healthStatus, prevData) => {
    const geomapsCol = currentUser
      .mongoClient("mongodb-atlas")
      .db("defaultDb")
      .collection("geomaps");

    let newData = [];
    try {
      newData = await currentUser.functions.countCasesProv(healthStatus);
    } catch (err) {
      if (!currentUser.isLoggedIn) {
        await logIn();
        newData = await currentUser.functions.countCasesProv(healthStatus);
      } else {
        console.error(err);
      }
    }

    if (prevData === undefined) {
      try {
        prevData = await geomapsCol
          .findOne({ name: "ph-prov" })
          .then((d) => d.geo);
      } catch (err) {
        prevData = { features: [] };
        console.error(err);
      }
    }

    if (prevData) {
      newData = prevData.features.map((f, idx) => {
        const matchData = newData.filter(({ _id }) => {
          if (_id !== null) {
            return f.properties.adm2Pcode.substring(0, 6) === _id;
          }
          return false;
        });

        if (matchData.length > 0) {
          let { count } = matchData[0];
          if (!Number.isInteger(count)) count = 0;
          const newProp = { ...f.properties, count };
          return { ...f, properties: newProp, id: idx };
        } else {
          const newProp = { ...f.properties, count: 0 };
          return { ...f, properties: newProp, id: idx };
        }
      });

      newData = { ...prevData, features: newData };

      return newData;
    }

    return EMPTY_GEOJSON;
  };

  const getStats = async () => {
    let stats;
    try {
      stats = await currentUser.functions.getStats();
    } catch (err) {
      if (!currentUser.isLoggedIn) {
        stats = await currentUser.functions.getStats();
      } else {
        console.error(err);
      }
    }

    return stats;
  };

  const wrapped = {
    ...app,
    currentUser,
    getStats,
    fetchStatsProv
  };
  return (
    <RealmAppContext.Provider value={wrapped}>
      {children}
    </RealmAppContext.Provider>
  );
};

RealmAppProvider.propTypes = {
  appId: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired
};
