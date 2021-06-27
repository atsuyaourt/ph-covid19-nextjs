const Realm = require("realm");

const app = new Realm.App({ id: process.env.REALM_APP_ID });

const HEALTH_STATUS_ENUM = [
  "all",
  "active",
  "recovered",
  "asymptomatic",
  "mild",
  "severe",
  "critical",
  "died"
];

async function login() {
  const credentials = Realm.Credentials.serverApiKey(process.env.REALM_API_KEY);

  try {
    const currentUser = await app.logIn(credentials);
    console.log("Successfully logged in!", currentUser.id);
  } catch (err) {
    console.error("Failed to log in", err.message);
  }
}

async function logout() {
  try {
    await app.currentUser.logOut();
  } catch (err) {
    console.error("Failed to log out", err.message);
  }
}

const getCountSummary = async () => {
  try {
    if (app.currentUser.state !== "LoggedIn") await login();

    return JSON.stringify(await app.currentUser.functions.getStats());
  } catch (err) {
    console.error("Failed to get data", err.message);
  }

  return [];
};

const getCountCasesProv = async () => {
  try {
    if (app.currentUser.state !== "LoggedIn") await login();

    let data = await Promise.all(
      HEALTH_STATUS_ENUM.map((healthStatus) => {
        let _hs = healthStatus;
        if (healthStatus === "all") _hs = "";
        return app.currentUser.functions.countCasesProv(_hs);
      })
    );

    data = data
      .map((d, i) => ({
        healthStatus: HEALTH_STATUS_ENUM[i],
        data: d
      }))
      .reduce(
        (obj, { healthStatus, data }) => ({
          ...obj,
          [healthStatus]: data
        }),
        {}
      );

    return JSON.stringify(data);
  } catch (err) {
    console.error("Failed to get data", err.message);
  }
};

const getBasemap = async () => {
  try {
    if (app.currentUser.state !== "LoggedIn") await login();

    const data = await app.currentUser
      .mongoClient("mongodb-atlas")
      .db("defaultDb")
      .collection("geomaps")
      .findOne({ name: "ph-prov" })
      .then((d) => d.geo);

    return JSON.stringify(data);
  } catch (err) {
    console.error("Failed to get data", err.message);
  }
};

module.exports = {
  login,
  logout,
  getCountCasesProv,
  getCountSummary,
  getBasemap
};
