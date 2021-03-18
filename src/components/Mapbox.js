import React, { useState, useRef, useEffect } from 'react'

import mapboxgl from 'mapbox-gl'

import { useRealmApp } from '../RealmApp'

// eslint-disable-next-line no-undef
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN

export const Mapbox = () => {
  const mapContainerRef = useRef(null)
  // eslint-disable-next-line no-unused-vars
  const [map, setMap] = useState(null)
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
      setMap(map)

      const caseCountLayer = await app.fetchData(new Date('2021-03-18'))

      map.addSource('ph-covid19-source', {
        type: 'geojson',
        data: caseCountLayer,
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

  return <div className="absolute top-0 bottom-0 left-0 right-0" ref={mapContainerRef} />
}
