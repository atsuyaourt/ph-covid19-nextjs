import React, { useState, useRef, useEffect } from 'react'
import mapboxgl from 'mapbox-gl'

import { useRealmApp } from '../RealmApp'

import { MapControl, LoadingMsg, MapLegend } from '.'

// eslint-disable-next-line no-undef
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN

const REDS = ['#ffffff', '#fef0d9', '#fdd49e', '#fdbb84', '#fc8d59', '#e34a33', '#b30000']

export const Mapbox = () => {
  const mapContainerRef = useRef(null)
  const [map, setMap] = useState(null)
  const [selectedValues, setSelectedValues] = useState({ fetchDate: '', healthStatus: '' })
  const [dateRange, setDateRange] = useState({})
  const [threshVal, _setThreshVal] = useState(0)
  const [showLoadingMsg, setShowLoadingMsg] = useState(true)
  const [hoveredFeature, _setHoveredFeature] = useState(null)
  const hoveredFeatureRef = useRef(hoveredFeature)
  const app = useRealmApp()

  const setHoveredFeature = (data) => {
    hoveredFeatureRef.current = data
    _setHoveredFeature(data)
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
      const _dateRange = await app.getDateRange()
      const _initValues = { ...selectedValues, fetchDate: _dateRange.maxDate }

      const caseCountLayer = await app.fetchData(_initValues)

      map.addSource('ph-covid19', {
        type: 'geojson',
        data: caseCountLayer,
      })

      map.addLayer({
        id: 'ph-covid19',
        type: 'fill',
        source: 'ph-covid19',
        layout: {},
        paint: {
          'fill-color': genLayerFillColor(0, threshVal),
          'fill-outline-color': '#000000',
          'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.9, 0.7],
        },
      })

      map.on('mousemove', 'ph-covid19', (e) => {
        if (e.features.length > 0) {
          if (hoveredFeatureRef.current && hoveredFeatureRef.current > -1) {
            map.setFeatureState(
              { source: 'ph-covid19', id: hoveredFeatureRef.current },
              { hover: false }
            )
          }

          let _hoveredFeature = e.features[0].id

          map.setFeatureState({ source: 'ph-covid19', id: _hoveredFeature }, { hover: true })

          setHoveredFeature(_hoveredFeature)
        }
      })

      map.on('mouseleave', 'ph-covid19', () => {
        if (hoveredFeatureRef.current) {
          map.setFeatureState(
            { source: 'ph-covid19', id: hoveredFeatureRef.current },
            { hover: false }
          )
        }
        setHoveredFeature(null)
      })

      map.on('sourcedata', (e) => {
        if (e.sourceId === 'ph-covid19') setShowLoadingMsg(false)
      })

      setMap(map)
      setDateRange(_dateRange)
      setSelectedValues(_initValues)
      setThreshVal(caseCountLayer)
    })

    // clean up on unmount
    return () => map.remove()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    try {
      map &&
        threshVal > 0 &&
        map.setPaintProperty('ph-covid19', 'fill-color', genLayerFillColor(0, threshVal))
    } catch (error) {
      console.log(error)
    }
  }, [threshVal])

  useEffect(async () => {
    setShowLoadingMsg(true)

    const caseCountLayer = await app.fetchData(selectedValues)
    try {
      map && map.getSource('ph-covid19').setData(caseCountLayer)
    } catch (error) {
      console.log(error)
    }

    setThreshVal(caseCountLayer)
  }, [selectedValues])

  const genLayerFillColor = (minVal, maxVal) => {
    const lyrFillClr = ['interpolate', ['linear'], ['get', 'count']]
    if (maxVal === minVal) {
      lyrFillClr.push(minVal)
      lyrFillClr.push(['to-color', REDS[1]])
    } else {
      const inc = (maxVal - minVal) / 6
      REDS.forEach((c, idx) => {
        lyrFillClr.push(minVal + inc * idx)
        lyrFillClr.push(['to-color', c])
      })
    }
    return lyrFillClr
  }

  const setThreshVal = (caseCountLayer) => {
    let maxCount = caseCountLayer.features
      .map((o) => o.properties.count)
      .filter((v) => Number.isInteger(v))
      .reduce((prev, current) => {
        return prev > current ? prev : current
      }, 0)

    if (maxCount > 500) maxCount = 500

    _setThreshVal(maxCount)
  }

  return (
    <>
      <div className="absolute top-0 bottom-0 left-0 right-0" ref={mapContainerRef} />
      {Object.prototype.toString.call(selectedValues.fetchDate) === '[object Date]' && (
        <MapControl
          minDate={dateRange.minDate}
          maxDate={dateRange.maxDate}
          dateSelected={selectedValues.fetchDate}
          healthStatSelected={selectedValues.healthStatus}
          onChange={(fetchDate, healthStatus) => setSelectedValues({ fetchDate, healthStatus })}
        />
      )}
      {showLoadingMsg && <LoadingMsg />}
      {!showLoadingMsg && <MapLegend title="Number of People" max={threshVal} colorArr={REDS} />}
    </>
  )
}
