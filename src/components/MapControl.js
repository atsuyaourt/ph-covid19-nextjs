import React from 'react'
import PropTypes from 'prop-types'
import { format as dateFormat, subDays } from 'date-fns'

import DatePicker from 'react-datepicker'

import 'react-datepicker/dist/react-datepicker.css'

export const MapControl = ({ minDate, maxDate, dateSelected, healthStatSelected, onChange }) => {
  return (
    <div className="absolute top-0 bg-white p-4 m-3 rounded-lg shadow-xl space-y-3">
      {minDate && (
        <fieldset className="flex flex-col space-y-1">
          <label htmlFor="date-selector" className="font-medium">
            Date:
          </label>
          <DatePicker
            name="date-selector"
            className="ring-2 ring-teal-600 p-1 rounded rounded-md"
            popperClassName="bg-teal-300"
            selected={dateSelected || MapControl.defaultProps.dateSelected}
            minDate={minDate}
            maxDate={maxDate}
            showYearDropdown
            showMonthDropdown
            onChange={(d) => onChange(d, healthStatSelected)}
          />
        </fieldset>
      )}
      <fieldset className="flex flex-col space-y-1">
        <label htmlFor="health-status" className="font-medium">
          Health Status:
        </label>
        <select
          name="health-status"
          value={healthStatSelected}
          className="ring-2 ring-teal-600 p-1 rounded rounded-md"
          onChange={(e) => onChange(dateSelected, e.target.value)}
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
  dateSelected: PropTypes.instanceOf(Date),
  minDate: PropTypes.instanceOf(Date),
  maxDate: PropTypes.instanceOf(Date),
  healthStatSelected: PropTypes.string,
  onChange: PropTypes.func.isRequired,
}

MapControl.defaultProps = {
  dateSelected: new Date(`${dateFormat(subDays(new Date(), 1), 'yyyy-MM-dd')}T00:00:00.000+08:00`),
  minDate: new Date('2020-01-01T00:00:00+0800'),
  maxDate: new Date(`${dateFormat(subDays(new Date(), 1), 'yyyy-MM-dd')}T00:00:00.000+08:00`),
}
