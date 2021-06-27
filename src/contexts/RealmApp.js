import React, { useState, useContext, createContext } from "react";

const RealmAppContext = createContext();

const EMPTY_GEOJSON = {
  type: "FeatureCollection",
  features: []
};

export const useRealmApp = () => {
  const app = useContext(RealmAppContext);
  if (!app) {
    throw new Error(
      `You must call useRealmApp() inside of a <RealmAppProvider />`
    );
  }
  return app;
};

export const RealmAppProvider = ({ children, data }) => {
  const [provCount, setProvCount] = useState({});

  const fetchStatsProv = async (healthStatus, prevData) => {
    let newData =
      healthStatus !== "" ? provCount[healthStatus] : provCount["all"];

    if (!newData) {
      try {
        newData =
          healthStatus !== ""
            ? data.countCasesProv[healthStatus]
            : data.countCasesProv["all"];
      } catch (err) {
        console.error(err);
      }

      if (prevData === undefined) {
        try {
          prevData = data.basemap;
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

        healthStatus !== ""
          ? setProvCount({ ...provCount, [healthStatus]: newData })
          : setProvCount({ ...provCount, all: newData });

        return newData;
      }
    } else {
      return newData;
    }

    return EMPTY_GEOJSON;
  };

  const wrapped = {
    ...data,
    fetchStatsProv
  };
  return (
    <RealmAppContext.Provider value={wrapped}>
      {children}
    </RealmAppContext.Provider>
  );
};
