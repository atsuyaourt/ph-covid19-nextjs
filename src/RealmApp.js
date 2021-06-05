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
    const credentials = Credentials.apiKey(apiKey);
    const user = await app.logIn(credentials);
    setCurrentUser(user);

    return async () => {
      const user = await currentUser.logOut();
      setCurrentUser(user);
    };
  }, [currentUser]);

  const fetchStatsProv = async (healthStatus, prevData) => {
    const geomapsCol = currentUser
      .mongoClient("mongodb-atlas")
      .db("defaultDb")
      .collection("geomaps");

    let newData =
      (await currentUser.functions
        .countCasesProv(healthStatus)
        .catch((e) => console.log(e))) || [];

    if (prevData === undefined) {
      prevData =
        (await geomapsCol
          .findOne({ name: "ph-prov" })
          .then((d) => d.geo)
          .catch((e) => console.log(e))) || [];
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

  const wrapped = {
    ...app,
    currentUser,
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
