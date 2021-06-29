const Realm = require("realm");

const app = new Realm.App({ id: process.env.REALM_APP_ID });

let basemap;
let countSummary;

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
  try {
    if (!app.currentUser) {
      const credentials = Realm.Credentials.serverApiKey(
        process.env.REALM_API_KEY
      );
      await app.logIn(credentials);
    }

    console.log("Successfully logged in!", app.currentUser.id);
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
    if (!countSummary) {
      await login();
      countSummary = await app.currentUser.functions.getStats();
    } else {
      console.log("count summary fetched already");
    }
  } catch (err) {
    console.error("Failed to get data", err.message);
  }

  return JSON.stringify(countSummary);
};

const getCountCasesProv = async (healthStatus) => {
  try {
    await login();

    if (healthStatus === "all") healthStatus = "";

    let data = await app.currentUser.functions.countCasesProv(healthStatus);

    return JSON.stringify(data);
  } catch (err) {
    console.error("Failed to get data", err.message);
  }
};

const getBasemap = async () => {
  try {
    if (!basemap) {
      await login();

      basemap = await app.currentUser
        .mongoClient("mongodb-atlas")
        .db("defaultDb")
        .collection("geomaps")
        .findOne({ name: "ph-prov" })
        .then((d) => d.geo);
    }
  } catch (err) {
    console.error("Failed to get data", err.message);
  }

  return JSON.stringify(basemap);
};

module.exports = {
  login,
  logout,
  healthStatusEnum: HEALTH_STATUS_ENUM,
  getCountCasesProv,
  getCountSummary,
  getBasemap
};
