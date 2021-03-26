import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'

export const Collapsible = ({ className, children, icon: Icon, btnPosition }) => {
  const [showContent, setShowContent] = useState(true)
  const [showButton, setShowButton] = useState(false)

  useEffect(() => {
    window.addEventListener('resize', (e) => {
      const viewCond = e.target.innerWidth < 640
      setShowButton(viewCond)
      setShowContent(!viewCond)
    })
  }, [])

  const handleClick = () => {
    setShowContent(!showContent)
  }

  return (
    <div className={className}>
      <div className={`${showContent ? 'visible' : 'invisible h-0 w-0'}`}>{children}</div>
      {showButton && (
        <button
          className={`absolute top-0 ${btnPosition}-0 m-3 bg-white text-black p-0.5 rounded-sm shadow`}
          onClick={handleClick}
        >
          <Icon />
        </button>
      )}
    </div>
  )
}

Collapsible.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  icon: PropTypes.elementType,
  btnPosition: PropTypes.oneOf(['left', 'right']),
}

Collapsible.defaultProps = {
  btnPosition: 'left',
}
