import { RealmAppProvider } from "../RealmApp";
import { Mapbox } from "../components";

function Page({ realmAppId, realmApiKey, mapboxAccessToken }) {
  return (
    <RealmAppProvider appId={realmAppId} apiKey={realmApiKey}>
      <Mapbox accessToken={mapboxAccessToken} />
    </RealmAppProvider>
  );
}

export function getStaticProps() {
  return {
    props: {
      realmAppId: process.env.REALM_APP_ID,
      realmApiKey: process.env.REALM_API_KEY,
      mapboxAccessToken: process.env.MAPBOX_ACCESS_TOKEN,
    },
  };
}

export default Page;
