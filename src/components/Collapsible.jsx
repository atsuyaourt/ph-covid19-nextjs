import { useState, useEffect } from "react";
import { useWindowSize } from "../hooks";

export const Collapsible = ({
  className,
  children,
  icon: Icon,
  btnPosition,
}) => {
  const [showContent, setShowContent] = useState(true);
  const [showButton, setShowButton] = useState(false);
  const windowSize = useWindowSize();

  useEffect(() => {
    const viewCond = windowSize.width < 640;
    setShowButton(viewCond);
    setShowContent(!viewCond);
  }, [windowSize.width]);

  const handleClick = () => {
    setShowContent(!showContent);
  };

  return (
    <div className={className}>
      {showContent && children}
      {showButton && (
        <button
          className={`absolute top-0 ${btnPosition}-0 m-3 bg-white text-black p-0.5 rounded-sm shadow`}
          onClick={handleClick}
        >
          <Icon />
        </button>
      )}
    </div>
  );
};
