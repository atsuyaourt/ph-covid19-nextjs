import React from 'react'
import PropTypes from 'prop-types'

export const MapLegend = ({ colorArr, min, max, title }) => {
  return (
    <div className="absolute top-0 right-0 bg-white p-3 m-3 rounded-lg shadow-2xl flex flex-col items-center justify-center">
      <span className="text-lg font-semibold">{title}</span>
      {max !== 0 && (
        <div className="flex flex-col">
          <div className="flex border">
            {colorArr.map((clr, idx) => (
              <div className="w-7 h-5" style={{ backgroundColor: `${clr}` }} key={idx}></div>
            ))}
          </div>
          <div className="flex justify-between text-sm">
            <span>{min}</span>
            <span>{max}</span>
          </div>
        </div>
      )}
    </div>
  )
}

MapLegend.propTypes = {
  colorArr: PropTypes.arrayOf(PropTypes.string).isRequired,
  min: PropTypes.number,
  max: PropTypes.number.isRequired,
  title: PropTypes.string,
}

MapLegend.defaultProps = {
  min: 0,
  title: 'Legend',
}
