import { RealmAppProvider } from "../contexts/RealmApp";
import { Mapbox } from "../components";
import { getCountSummary, getCountCasesProv, getBasemap } from "../util/realm";

function Page({ mapboxAccessToken, data }) {
  return (
    <RealmAppProvider data={data}>
      <Mapbox accessToken={mapboxAccessToken} />
    </RealmAppProvider>
  );
}

export const getStaticProps = async () => {
  const countSummary = JSON.parse(await getCountSummary());
  const countCasesProv = JSON.parse(await getCountCasesProv());
  const basemap = JSON.parse(await getBasemap());

  return {
    props: {
      mapboxAccessToken: process.env.MAPBOX_ACCESS_TOKEN,
      data: { countSummary, countCasesProv, basemap },
    },
  };
};

export default Page;
