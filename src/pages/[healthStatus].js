import { RealmAppProvider } from "../contexts/RealmApp";
import { Mapbox } from "../components";
import {
  healthStatusEnum,
  getBasemap,
  getCountSummary,
  getCountCasesProv
} from "../util/realm";

function HealthStatusPage({ mapboxAccessToken, data }) {
  return (
    <RealmAppProvider data={data}>
      <Mapbox accessToken={mapboxAccessToken} />
    </RealmAppProvider>
  );
}

export const getStaticPaths = async () => {
  const paths = healthStatusEnum.map((healthStatus) => ({
    params: { healthStatus }
  }));

  return { paths, fallback: false };
};

export const getStaticProps = async ({ params }) => {
  try {
    const countSummary = JSON.parse(await getCountSummary());
    const countCasesProv = JSON.parse(
      await getCountCasesProv(params.healthStatus)
    );
    const basemap = JSON.parse(await getBasemap());

    return {
      props: {
        mapboxAccessToken: process.env.MAPBOX_ACCESS_TOKEN,
        data: { basemap, countSummary, countCasesProv }
      },
      revalidate: 60
    };
  } catch (err) {
    return {
      notFound: true
    };
  }
};

export default HealthStatusPage;
