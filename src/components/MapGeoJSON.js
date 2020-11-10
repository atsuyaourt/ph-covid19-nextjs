import React, { useEffect, useState } from 'react';
import { GeoJSON } from 'react-leaflet';
import axios from 'axios';

import MAP_DATA_FILE from '../data/province.geojson';

const CASE_STATS_URI = "https://phcovid19api.carpe-datum.live/v1/cases/stats";

export default function MapGeoJSON() {
  const [mapData, setMapData] = useState({});
  const loadData = async () => {
    const caseData = await axios.get(CASE_STATS_URI)
      .then(response => response.data)
      .catch(error => error);

    const mapData = await axios.get(MAP_DATA_FILE)
      .then(response => response.data)
      .catch(error => error);

    const { type: gtype, crs, features } = mapData;

    const newMapData = features.map(({ type: mtype, properties, geometry }) => {
      const matchMapData = caseData.filter(({ regionResGeo, provResGeo }) => {
        return (properties.region === regionResGeo) && (properties.province === provResGeo)
      });

      if (matchMapData.length > 0) {
        return matchMapData.map(m => {
          const { healthStatus, count } = m;
          const newProp = { ...properties, healthStatus, count };
          return { type: mtype, properties: newProp, geometry };
        });
      } else {
        return { type: mtype, properties: properties, geometry };
      }

    });

    setMapData({ type: gtype, crs, features: [].concat(...newMapData) });
  };

  useEffect(() => {
    loadData();
    return () => { };
  }, []);

  const featStyle = (feature) => {
    // TODO: Fix style
    if (feature.properties.count > 50) {
      return { color: "#ff0000" };
    } else {
      return { color: "#0000ff" };
    }
  }

  return Object.keys(mapData).length > 0 && <GeoJSON data={mapData} style={featStyle} />

};
