import React, { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import mapboxgl from 'mapbox-gl'

import { useRealmApp } from '../RealmApp'

// eslint-disable-next-line no-unused-vars
import PH_PROV_GJSON from '../data/ph/province.geojson'

// eslint-disable-next-line no-undef
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN

export const Mapbox = () => {
  const mapContainerRef = useRef(null)
  const [hoveredProvince, _sethoveredProvince] = useState(null)
  const hoveredProvinceRef = useRef(hoveredProvince)
  const app = useRealmApp()

  const sethoveredProvince = (data) => {
    hoveredProvinceRef.current = data
    _sethoveredProvince(data)
  }

  // initialize map when component mounts
  useEffect(() => {
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      // See style options here: https://docs.mapbox.com/api/maps/#styles
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [121.774, 12.8797],
      zoom: 5,
    })

    // add navigation control (the +/- zoom buttons)
    map.addControl(new mapboxgl.NavigationControl(), 'bottom-right')

    map.once('load', async () => {
      const mongodb = app.currentUser.mongoClient('mongodb-atlas')
      const cases = mongodb.db('default').collection('cases')

      const groupId = {
        regionResGeo: '$regionResGeo',
        provResGeo: '$provResGeo',
        healthStatus: '$healthStatus',
      }

      const project = {
        regionResGeo: '$_id.regionResGeo',
        provResGeo: '$_id.provResGeo',
        healthStatus: '$_id.healthStatus',
        count: 1,
        _id: 0,
      }

      const caseCount = await cases.aggregate([
        {
          $match: {
            deletedAt: {
              $exists: 0,
            },
            createdAt: new Date('2021-03-15T00:00:00.000+08:00'),
          },
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

      const phProvMap = await axios
        .get(PH_PROV_GJSON)
        .then((response) => response.data)
        .catch((error) => error)

      const { type: gtype, crs, features } = phProvMap

      let mapData = features.map(({ type: mtype, properties, geometry }, idx) => {
        const matchMapData = caseCount.filter(({ regionResGeo, provResGeo }) => {
          return properties.region === regionResGeo && properties.province === provResGeo
        })

        if (matchMapData.length > 0) {
          return matchMapData.map((m) => {
            const { healthStatus, count } = m
            const newProp = { ...properties, healthStatus, count }
            return { id: idx, type: mtype, properties: newProp, geometry }
          })
        } else {
          return { id: idx, type: mtype, properties: properties, geometry }
        }
      })

      map.addSource('ph-covid19-source', {
        type: 'geojson',
        data: { type: gtype, crs, features: [].concat(...mapData) },
      })

      map.addLayer({
        id: 'ph-covid19-layer',
        type: 'fill',
        source: 'ph-covid19-source',
        layout: {},
        paint: {
          'fill-color': [
            'interpolate',
            ['linear'],
            ['get', 'count'],
            0,
            ['to-color', '#ffffff'],
            10,
            ['to-color', '#fef0d9'],
            20,
            ['to-color', '#fdcc8a'],
            40,
            ['to-color', '#fc8d59'],
            100,
            ['to-color', '#e34a33'],
            200,
            ['to-color', '#b30000'],
          ],
          'fill-outline-color': '#000000',
          'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.9, 0.5],
        },
      })

      map.on('mousemove', 'ph-covid19-layer', (e) => {
        if (e.features.length > 0) {
          if (hoveredProvinceRef.current && hoveredProvinceRef.current > -1) {
            map.setFeatureState(
              { source: 'ph-covid19-source', id: hoveredProvinceRef.current },
              { hover: false }
            )
          }

          let _hoveredProvince = e.features[0].id

          map.setFeatureState(
            { source: 'ph-covid19-source', id: _hoveredProvince },
            { hover: true }
          )

          sethoveredProvince(_hoveredProvince)
        }
      })

      map.on('mouseleave', 'ph-covid19-layer', () => {
        if (hoveredProvinceRef.current) {
          map.setFeatureState(
            { source: 'ph-covid19-source', id: hoveredProvinceRef.current },
            { hover: false }
          )
        }
        sethoveredProvince(null)
      })
    })

    // clean up on unmount
    return () => map.remove()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <div className="map-container" ref={mapContainerRef} />
}
