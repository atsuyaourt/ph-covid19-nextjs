import React from 'react'
import PropTypes from 'prop-types'

export const MapControl = ({ healthStatSelected, onChange }) => {
  return (
    <div className="bg-white p-4 m-3 rounded-lg shadow-xl space-y-3">
      <fieldset className="flex flex-col space-y-1">
        <label htmlFor="health-status" className="font-medium">
          Health Status:
        </label>
        <select
          name="health-status"
          value={healthStatSelected}
          className="ring-2 ring-teal-600 p-1 rounded rounded-md"
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="recovered">Recovered</option>
          <option value="asymptomatic">Asymptomatic</option>
          <option value="mild">Mild</option>
          <option value="severe">Severe</option>
          <option value="critical">Critical</option>
          <option value="died">Deaths</option>
        </select>
      </fieldset>
    </div>
  )
}

MapControl.propTypes = {
  healthStatSelected: PropTypes.string,
  onChange: PropTypes.func.isRequired,
}
