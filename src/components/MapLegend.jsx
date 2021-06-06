export const MapLegend = ({ title, legend }) => {
  return (
    <div className="bg-white p-3 m-3 rounded-lg shadow-2xl flex flex-col items-center justify-center">
      <span className="text-md md:text-lg font-semibold">{title}</span>
      {"label" in legend && (
        <div className="flex flex-col">
          <div className="flex border">
            {legend.color.map((clr, idx) => (
              <div
                className="w-8 h-5 md:w-10 md:h-7"
                style={{ backgroundColor: `${clr}` }}
                key={idx}
              ></div>
            ))}
          </div>
          <div className="flex text-xs font-semibold pl-4 md:pl-5">
            {legend.label.slice(1).map((l, idx) => (
              <div className="flex w-8 md:w-10 justify-center" key={idx}>
                {l}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
