import React from 'react'
import PropTypes from 'prop-types'

export const MapStats = ({ data }) => {
  return (
    <div className="bg-white p-5 m-3 rounded-lg shadow-2xl flex flex-col items-end space-y-4">
      <div className="flex flex-col items-end">
        <span className="text-3xl font-bold text-teal-600">
          {new Intl.NumberFormat().format(data.newCase.active)}
        </span>
        <span className="text-sm font-base text-gray-600">new</span>
      </div>
      <div className="flex flex-col items-end">
        <span className="text-3xl font-bold text-blue-600">
          {new Intl.NumberFormat().format(data.totCase.active)}
        </span>
        <span className="text-sm font-base text-gray-600">active</span>
      </div>
      <div className="flex flex-col items-end">
        <span className="text-3xl font-bold text-green-500">
          {new Intl.NumberFormat().format(data.totCase.recovered)}
        </span>
        <span className="text-sm font-base text-gray-600">recovered</span>
      </div>
      <div className="flex flex-col items-end">
        <span className="text-3xl font-bold text-gray-600">
          {new Intl.NumberFormat().format(data.totCase.died)}
        </span>
        <span className="text-sm font-base text-gray-600">deaths</span>
      </div>
    </div>
  )
}

MapStats.propTypes = {
  data: PropTypes.object,
}
