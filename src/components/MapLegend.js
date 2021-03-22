import React from 'react'
import PropTypes from 'prop-types'

export const MapLegend = ({ title, colorArr, labelArr }) => {
  return (
    <div className="bg-white p-3 m-3 rounded-lg shadow-2xl flex flex-col items-center justify-center">
      <span className="text-lg font-semibold">{title}</span>
      {labelArr.length !== 0 && (
        <div className="flex flex-col">
          <div className="flex border">
            {colorArr.map((clr, idx) => (
              <div className="w-10 h-7" style={{ backgroundColor: `${clr}` }} key={idx}></div>
            ))}
          </div>
          <div className="flex text-xs font-semibold pl-5">
            {labelArr.map(
              (l, idx) =>
                idx < labelArr.length - 1 && (
                  <div className="flex w-10 justify-center" key={idx}>
                    {l}
                  </div>
                )
            )}
          </div>
        </div>
      )}
    </div>
  )
}

MapLegend.propTypes = {
  colorArr: PropTypes.arrayOf(PropTypes.string).isRequired,
  labelArr: PropTypes.arrayOf(PropTypes.string).isRequired,
  title: PropTypes.string,
}

MapLegend.defaultProps = {
  title: 'Legend',
}
