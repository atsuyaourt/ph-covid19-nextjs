import React, { useState, useRef, useEffect } from 'react'
import mapboxgl from 'mapbox-gl'

import { useRealmApp } from '../RealmApp'

import { MapControl, LoadingMsg, MapLegend } from '.'

// eslint-disable-next-line no-undef
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN

const REDS = ['#ffffff', '#fef0d9', '#fdcc8a', '#fc8d59', '#e34a33', '#b30000']

export const Mapbox = () => {
  const mapContainerRef = useRef(null)
  const [map, setMap] = useState(null)
  const [selectedValues, setSelectedValues] = useState({ fetchDate: '', healthStatus: '' })
  const [dateRange, setDateRange] = useState({})
  const [legendLabelArr, setLegendLabelArr] = useState([])
  const [legendColArr, setLegendColArr] = useState([])
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

      const caseCountArr = caseCountLayer.features
        .map((o) => o.properties.count)
        .filter((v) => Number.isInteger(v))
      const layerFillColor = genLayerFillColor(caseCountArr, REDS)

      map.addLayer({
        id: 'ph-covid19',
        type: 'fill',
        source: 'ph-covid19',
        layout: {},
        paint: {
          'fill-color': layerFillColor,
          'fill-outline-color': '#000000',
          'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.9, 0.7],
        },
      })

      map.on('click', 'ph-covid19', (e) => {
        const { province, count } = e.features[0].properties
        new mapboxgl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(
            `
            <div class="flex flex-col space-y-2 m-1">
              <div class="text-base font-semibold border-b border-gray-300">${province}</div>
              <div class="flex flex-row">
                <div class="text-sm font-medium pr-1">Count:</div>
                <div class="text-sm">${new Intl.NumberFormat().format(count)}</div>
              </div>
            </div>
            `
          )
          .addTo(map)
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

      map.on('mouseenter', 'ph-covid19', () => {
        map.getCanvas().style.cursor = 'pointer'
      })

      map.on('mouseleave', 'ph-covid19', () => {
        map.getCanvas().style.cursor = ''
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
    })

    // clean up on unmount
    return () => map.remove()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(async () => {
    setShowLoadingMsg(true)

    const caseCountLayer = await app.fetchData(selectedValues)
    try {
      if (typeof map !== 'undefined' && map !== null) {
        map.getSource('ph-covid19').setData(caseCountLayer)
        const caseCountArr = caseCountLayer.features
          .map((o) => o.properties.count)
          .filter((v) => Number.isInteger(v))

        const fillColArr = genLayerFillColor(caseCountArr, REDS)

        caseCountArr > 0 && map.setPaintProperty('ph-covid19', 'fill-color', fillColArr)
      }
    } catch (error) {
      console.log(error)
    }
  }, [selectedValues])

  const genLayerFillColor = (valArr, colArr) => {
    const _legendLabelArr = []
    const _legendColArr = []
    const lyrFillClr = ['interpolate', ['linear'], ['get', 'count']]

    const sortedArr = valArr.sort((a, b) => a - b)
    const minVal = 0
    const maxVal = valArr.reduce((a, b) => {
      return a > b ? a : b
    }, 0)

    if (maxVal === minVal) {
      lyrFillClr.push(minVal)
      lyrFillClr.push(['to-color', colArr[1]])
    } else {
      let plevVal = ''
      let clevVal = ''
      colArr.forEach((c, idx) => {
        const pos = (sortedArr.length - 1) * (idx / colArr.length)
        const base = Math.floor(pos)
        const rest = pos - base
        if (sortedArr[base + 1] !== undefined) {
          clevVal = sortedArr[base] + rest * (sortedArr[base + 1] - sortedArr[base])
          lyrFillClr.push()
        } else {
          clevVal = sortedArr[base]
        }
        if (clevVal !== plevVal) {
          _legendLabelArr.push(clevVal)
          _legendColArr.push(c)
          lyrFillClr.push(clevVal)
          lyrFillClr.push(['to-color', c])
          plevVal = clevVal
        }
      })
    }
    setLegendLabelArr(_legendLabelArr.map((l) => String(l)))
    setLegendColArr(_legendColArr)
    return lyrFillClr
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
      {!showLoadingMsg && (
        <MapLegend title="Number of Cases" labelArr={legendLabelArr} colorArr={legendColArr} />
      )}
    </>
  )
}
