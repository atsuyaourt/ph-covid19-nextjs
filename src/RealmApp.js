import React, { useState, useContext, useEffect } from "react";
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
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    logIn();
    return () => logOut();
  }, []);

  const logIn = async () => {
    let user = {};
    const credentials = Credentials.apiKey(apiKey);
    try {
      user = await app.logIn(credentials);
      setIsLoggedIn(true);
    } catch (err) {
      setIsLoggedIn(false);
      console.error(err);
    }
    setCurrentUser(user);
    return user;
  };

  const logOut = async () => {
    let user = {};
    try {
      user = await currentUser.logOut();
    } catch (err) {
      console.error(err);
    }
    setCurrentUser(user);
  };

  const fetchStatsProv = async (healthStatus, prevData) => {
    if (!isLoggedIn) await logIn();

    const geomapsCol = currentUser
      .mongoClient("mongodb-atlas")
      .db("defaultDb")
      .collection("geomaps");

    let newData = [];
    try {
      newData = await currentUser.functions.countCasesProv(healthStatus);
    } catch (err) {
      console.error(err);
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
    let stats = [];

    if (!isLoggedIn) await logIn();
    try {
      stats = await currentUser.functions.getStats();
    } catch (err) {
      console.error(err);
    }

    return stats;
  };

  const wrapped = {
    ...app,
    getStats,
    fetchStatsProv
  };
  return (
    <RealmAppContext.Provider value={wrapped}>
      {isLoggedIn && children}
    </RealmAppContext.Provider>
  );
};
