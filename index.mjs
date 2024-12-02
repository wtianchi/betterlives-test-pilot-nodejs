import pg from "pg";
const Client = pg.Client;
import fs from "fs"
import atob from "atob";
import md5 from 'md5';

export const handler = async (event) => {
  try{
    console.log(atob(event.body));
  }
  catch(e){
    
  }
  var ct = event.headers["content-type"];
  if(ct == undefined){
    ct = event.headers["Content-Type"];
  }
  const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB,
    password: process.env.DB_PASSWORD,
    port: process.env.PORT, 
    ssl  : {
      ca : fs.readFileSync('ca-central-1-bundle.pem')
    }
  });

  await client.connect(function(err) {
    if (err) throw err;
    console.log("Connected!");
  });
  var motion = undefined;
  if(event.hasOwnProperty("config")){
    motion = event["config"]["headers"]["motion"];
    
  }
  if(motion == undefined){
      motion = event["headers"]["motion"];
  }
  if(motion == undefined && event["queryStringParameters"] != null){
    motion = event["queryStringParameters"]["motion"];
  }
  try{
    console.log("motion", motion);
    console.log(atob(event.data.body));
  }
  catch(e){
  }
  if(motion == "login"){
    var query = "";
    var resBody = "";
    const t = getValueFromPost(event, "manager_id") + genRandString(32);
    query = "UPDATE test_pilot_manager SET token = $1 WHERE manager_id = $2 AND password = $3 RETURNING *";
    console.log(query);
    const res = await client.query(query, [t, getValueFromPost(event, "manager_id"), getValueFromPost(event, "password")]);
    if(res != undefined && res.rowCount > 0){
      delete res.rows[0].password;
      res.rows[0].status = 1;
      res.rows[0].isTestPilot = 1;
      resBody = JSON.stringify(res.rows[0]);
    }
    else{
      resBody = "{\"status\": \"0\" ,\"message\": \"Login Failed\"}";
    }
  }
  else if(motion == "logout"){
    var query = "";
    var resBody = "";
    const t = getValueFromPost(event, "manager_id") + genRandString(32);
    query = "UPDATE test_pilot_manager SET token = '' WHERE token = $1";
    console.log(query);
    const res = await client.query(query, [getValueFromPost(event, "token")]);
    if(res != undefined && res.rowCount > 0){
      resBody = "{\"status\": \"1\"}";
    }
    else{
      resBody = "{\"status\": \"0\" ,\"message\": \"Logout Failed\"}";
    }
  }
  else if(motion == "check_login"){
    var query = "";
    var resBody = "";
    query = "SELECT * FROM test_pilot_manager WHERE token = $1";
    console.log(query);
    const res = await client.query(query, [getValueFromPost(event, "token")]);
    if(res != undefined && res.rowCount > 0){
      delete res.rows[0].password;
      res.rows[0].status = 1;
      res.rows[0].isTestPilot = 1;
      resBody = JSON.stringify(res.rows[0]);
    }
    else{
      resBody = "{\"status\": \"0\" ,\"message\": \"Login Failed\"}";
    }
  }
  else if(motion == "manager_list"){
    if(await checkPermission(client, getValueFromPost(event, "token"), "admin")){
      var query = "";
      var resBody = "";
      query = "SELECT id, manager_id, user_name, permission, email, service_provider, service_provider_location FROM test_pilot_manager ORDER BY id";
      console.log(query);
      const res = await client.query(query);
      if(res != undefined && res.rowCount > 0){
        resBody = JSON.stringify({"status":"1", "results":res.rows});
      }
      else{
        resBody = "{\"status\": \"0\" ,\"message\": \"No Result Found\"}";
      }
    }
    else{
      resBody = "{\"status\": \"0\" ,\"message\": \"Permission Denied\"}";
    }
  }
  else if(motion == "case_worker_list"){
    if(await checkPermission(client, getValueFromPost(event, "token"), "admin")){
      var query = "";
      var resBody = "";
      query = "SELECT id, manager_id, user_name, permission, email, service_provider, service_provider_location FROM test_pilot_manager WHERE permission IN ('root', 'case_worker') ORDER BY id";
      console.log(query);
      const res = await client.query(query);
      if(res != undefined && res.rowCount > 0){
        resBody = JSON.stringify({"status":"1", "results":res.rows});
      }
      else{
        resBody = "{\"status\": \"0\" ,\"message\": \"No Result Found\"}";
      }
    }
    else{
      resBody = "{\"status\": \"0\" ,\"message\": \"Permission Denied\"}";
    }
  }
  else if(motion == "application_list"){
      var query = "";
      var resBody = "";
      query = "SELECT test_pilot_application.id, test_pilot_application.serial_num, test_pilot_application.date, test_pilot_application.provider_name, test_pilot_application.provider_location, test_pilot_application.client_name, test_pilot_application.case_worker_name, test_pilot_application.creat_time, test_pilot_application.applier, test_pilot_application.raw_file, test_pilot_application.used, test_pilot_manager.manager_id AS creator FROM test_pilot_application JOIN test_pilot_manager ON test_pilot_application.creator = test_pilot_manager.id";
      var id = getValueFromPost(event, "id");
      if(id != ""){
        query += " WHERE test_pilot_application.applier = " + id;
      }
      query += " ORDER BY test_pilot_application.id";
      console.log(query);
      const res = await client.query(query);
      if(res != undefined && res.rowCount > 0){
        resBody = JSON.stringify({"status":"1", "results":res.rows});
      }
      else{
        resBody = "{\"status\": \"0\" ,\"message\": \"No Result Found\"}";
      }
  }
  else if(motion == "add_manager"){
    if(await checkPermission(client, getValueFromPost(event, "token"), "admin")){
      var query = "";
      var resBody = "";
      query = "INSERT INTO test_pilot_manager (manager_id, password, user_name, email, permission, service_provider, service_provider_location) VALUES ($1,$2,$3,$4,$5,$6,$7)";
      console.log(query);
      const res = await client.query(query, [getValueFromPost(event, "new_manager_id"), getValueFromPost(event, "new_password"), getValueFromPost(event, "user_name"), getValueFromPost(event, "email"), getValueFromPost(event, "permission"), getValueFromPost(event, "service_provider"), getValueFromPost(event, "service_provider_location")]);
      if(res != undefined && res.rowCount > 0){
        resBody = JSON.stringify({"status":"1"});
      }
      else{
        resBody = "{\"status\": \"0\" ,\"message\": \"Failed\"}";
      }
    }
    else{
      resBody = "{\"status\": \"0\" ,\"message\": \"Permission Denied\"}";
    }
  }
  else if(motion == "update_manager"){
    if(await checkPermission(client, getValueFromPost(event, "token"), "admin")){
      var query = "";
      var resBody = "";
      query = "UPDATE test_pilot_manager SET permission = $1 WHERE id = $2";
      console.log(query);
      const res = await client.query(query, [getValueFromPost(event, "permission"), getValueFromPost(event, "id")]);
      if(res != undefined && res.rowCount > 0){
        resBody = JSON.stringify({"status":"1"});
      }
      else{
        resBody = "{\"status\": \"0\" ,\"message\": \"Failed\"}";
      }
    }
    else{
      resBody = "{\"status\": \"0\" ,\"message\": \"Permission Denied\"}";
    }
  }
  else if(motion == "update_applier"){
    if(await checkPermission(client, getValueFromPost(event, "token"), "admin")){
      var query = "";
      var resBody = "";
      query = "UPDATE test_pilot_application SET applier = $1 WHERE serial_num = $2";
      console.log(query);
      const res = await client.query(query, [getValueFromPost(event, "applier"), getValueFromPost(event, "serial_num")]);
      if(res != undefined && res.rowCount > 0){
        resBody = JSON.stringify({"status":"1"});
      }
      else{
        resBody = "{\"status\": \"0\" ,\"message\": \"Failed\"}";
      }
    }
    else{
      resBody = "{\"status\": \"0\" ,\"message\": \"Permission Denied\"}";
    }
  }
  else if(motion == "add_application"){
    if(await checkPermission(client, getValueFromPost(event, "token"), "admin")){
      var query = "";
      var resBody = "";  
      var param = [];
      var j = 1;
      query = "INSERT INTO test_pilot_application (serial_num, creator, applier) VALUES ";
      for (let i = 0; i < parseInt(getValueFromPost(event, "num")); i++) {
        if(i > 0){
          query += ",";
        }
        await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 100) + 1));
        var snum = md5(Date.now());
        query += "('" + snum + "',$" + j + ",$" + (j + 1) + ")";
        param.push(getValueFromPost(event, "id"));
        param.push(getValueFromPost(event, "applier"));
        j += 2;
        
      }
      query += " RETURNING *";
      console.log(query);
      console.log(param);
      const res = await client.query(query, param);
      if(res != undefined && res.rowCount > 0){
        resBody = JSON.stringify({"status":"1", "results":res.rows});
      }
      else{
        resBody = "{\"status\": \"0\" ,\"message\": \"Failed\"}";
      }
    }
    else{
      resBody = "{\"status\": \"0\" ,\"message\": \"Permission Denied\"}";
    }
  }
  else if(motion == "edit_profile"){
    var query = "";
    var resBody = "";
    var param = [];
    var i = 1;
    const email = getValueFromPost(event, "email");
    const newpass = getValueFromPost(event, "new_password");
    const password = getValueFromPost(event, "password");
    const user_name = getValueFromPost(event, "user_name");
    const manager_id = getValueFromPost(event, "manager_id");
    const service_provider = getValueFromPost(event, "service_provider");
    const service_provider_location = getValueFromPost(event, "service_provider_location");
    query = "UPDATE test_pilot_manager SET ";
    var p = false;
    if(user_name != "" ){
      if(p){
        query += ",";
      }
      query += "user_name = $" + i;
      p = true;
      i++;
      param.push(user_name);
    }
    if(newpass != "" && newpass != "d41d8cd98f00b204e9800998ecf8427e"){
      if(p){
        query += ",";
      }
      query += " password = $" + i;
      p = true;
      i++;
      param.push(newpass);
    }
    if(service_provider != "" ){
      if(p){
        query += ",";
      }
      query += " service_provider = $" + i;
      p = true;
      i++;
      param.push(service_provider);
    }
    if(service_provider_location != "" ){
      if(p){
        query += ",";
      }
      query += " service_provider_location = $" + i;
      p = true;
      i++;
      param.push(service_provider_location);
    }
    if(email != ""){
      if(p){
        query += ",";
      }
      query += " email = $" + i;
      p = true;
      i++;
      param.push(email);
    }        
    query += " WHERE manager_id = $" + i + " AND password = $" + (i + 1) + " RETURNING *";
    param.push(manager_id);
    param.push(password);
    console.log(query);
    console.log(param);
    if(p){
      var res = await client.query(query, param);
      if(res != undefined && res.rowCount > 0){
        res.rows[0].status = 1;
        res.rows[0].isTestPilot = 1;
        delete res.rows[0].password;
        resBody =  JSON.stringify(res.rows[0]);
      }
      else{
        resBody = "{\"status\": \"0\" ,\"message\": \"Failed\"}";
      }
    }
    else{
      resBody = JSON.stringify({"status":"2"});
    }
  }
  else if(motion == "update_form"){
    if(await checkPermission(client, getValueFromPost(event, "token"), "case_worker")){
      var query = "";
      var resBody = "";
      const serial_num = getValueFromPost(event, "serial_num");
      const date = getValueFromPost(event, "date");
      const provider_name = getValueFromPost(event, "provider_name");
      const provider_location = getValueFromPost(event, "provider_location");
      const client_name = getValueFromPost(event, "client_name");
      const case_worker_name = getValueFromPost(event, "case_worker_name");
      const raw_file = getValueFromPost(event, "raw_file");
      if(serial_num != "" && date !== "" && provider_name != "" && provider_location != "" && client_name != "" && case_worker_name != ""){

        query = "UPDATE test_pilot_application SET date = $1 ,provider_name = $2 ,provider_location = $3 ,client_name = $4 ,case_worker_name = $5";
        var i = 6;
        var param = [date, provider_name, provider_location, client_name, case_worker_name];
        if(raw_file != ""){
          query += " ,raw_file = $6";
          i++;
          param.push(raw_file);
        }
        query += " ,used = 1 WHERE serial_num = $" + i;
        param.push(serial_num);
        console.log(query);
        res = await client.query(query, param);
        if(res != undefined && res.rowCount > 0){
          
          resBody = JSON.stringify({"status":"1"});
        }
      }
      else{
        resBody = "{\"status\": \"0\" ,\"message\": \"Missing Params\"}";
      }
    }
    else{
      resBody = "{\"status\": \"0\" ,\"message\": \"Permission Denied\"}";
    }
  }
  else{
    resBody = "{\"status\": \"0\" ,\"message\": \"Motion Not Found\"}";
  }
  client.end();
  const response = {
    statusCode: 200,
    headers: {
        "Access-Control-Allow-Origin": "*",
        'Access-Control-Allow-Credentials': true,
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": 300
    },
    body: resBody 
  };
  return response;
};

function etoa(e){
  var body = e.body;
  if(body == undefined){
    body = e.data.body
  }
  let text = atob(body).replaceAll("\t", "");
  var ct = e.headers["content-type"];
  if(ct == undefined){
    ct = e.headers["Content-Type"];
  }
  if(ct == undefined || ct.indexOf("boundary=") < 0){
    ct = e.data.headers["Content-Type"];
  }
  var boundary = "--" + ct.split("boundary=")[1];
  var parts = text.split(boundary);
  return parts;
}

function getValueFromPost(e, key){
  var parts = etoa(e);
  for (var i = 0; i < parts.length; i++) {
    const k = "name=\"" + key + "\"";
    if(parts[i].includes(k)){
      return parts[i].split("\r\n\r\n")[1].replaceAll("\r", "").replaceAll("\n", "");
    }
  }
  return "";
}


function genRandString(size){
  const source = "`1234567890qwertyuiopasdfghjklzxcvbnm~!@#_";
  var result = "";
  for (var i = 0; i < size; i++) {
    result += source.charAt(Math.floor(Math.random() * source.length));
  }
  return result;
}

async function checkPermission(client, token, require){
  if(token != ""){
    var query = "SELECT id FROM test_pilot_manager WHERE token = $1 AND (permission = $2 OR permission = 'root')";
    //return query;
    console.log("check", query);
    const res = await client.query(query, [token, require]);
    console.log("check", res);
    if(res != undefined && res.rowCount > 0){
      return true;
    }
  }
  return false;
}
