// import { useState, useEffect } from "react";
import { format, parseJSON } from "date-fns";

import { useRealmApp } from "../contexts/RealmApp";

export const MapStats = () => {
  const app = useRealmApp();
  const stats = app.countSummary;

  return stats ? (
    <div className="bg-white p-4 m-3 rounded-lg shadow-2xl flex flex-col space-y-3 md:space-y-5 md:w-52">
      <div className="text-xs md:text-sm font-light italic text-gray-700">
        {`as of ${format(parseJSON(stats.maxDate), "MMM d, Y")}`}
      </div>
      <div className="flex flex-col items-end space-y-1 md:space-y-3">
        <div className="flex flex-col items-end">
          <span className="text-lg md:text-3xl font-bold text-blue-500">
            {new Intl.NumberFormat().format(stats.newCase.active)}
          </span>
          <span className="text-xs md:text-sm font-base text-blue-800">
            new
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-lg md:text-3xl font-bold text-yellow-500">
            {new Intl.NumberFormat().format(stats.totCase.active)}
          </span>
          <span className="text-xs md:text-sm font-base text-yellow-800">
            active
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-lg md:text-3xl font-bold text-green-500">
            {new Intl.NumberFormat().format(stats.totCase.recovered)}
          </span>
          <span className="text-xs md:text-sm font-base text-green-800">
            recovered
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-lg md:text-3xl font-bold text-red-500">
            {new Intl.NumberFormat().format(stats.totCase.died)}
          </span>
          <span className="text-xs md:text-sm font-base text-red-800">
            deaths
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-lg md:text-3xl font-bold text-gray-600">
            {new Intl.NumberFormat().format(
              stats.totCase.active +
                stats.totCase.recovered +
                stats.totCase.died
            )}
          </span>
          <span className="text-xs md:text-sm font-base text-gray-600">
            total
          </span>
        </div>
      </div>
    </div>
  ) : null;
};
