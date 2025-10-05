import fs from "fs";
import path from "path";

const readJSON = (fileName) =>
  JSON.parse(
    fs.readFileSync(path.resolve("./app/api/jsondata", fileName), "utf-8")
  );

const airdata = readJSON(
  "2024-04-08_AirTemp-EclipseArea_JSONFromAPI-2024-11-05.json"
);
const eclipseclouddata = readJSON(
  "2024-04-08_Clouds-EclipseArea_JSONFromAPI-2024-11-05.json"
);
const landdata = readJSON(
  "2024-04-08_LandCover-EclipseArea_JSONFromAPI-2024-11-05.json"
);
const windata = readJSON(
  "2024-04-08_Wind-EclipseArea_JSONFromAPI-2024-11-05.json"
);
const landcover = readJSON("Landcover.json");
const cloddata = readJSON("clouddata.json");

export { airdata, eclipseclouddata, landdata, windata, landcover, cloddata };