window.onload = function() {
    const BASE_URL_TWITCH = "https://api.twitch.tv/helix/streams?user_login=";
    //const BASE_URL_TWITCH = "https://id.twitch.tv/oauth2/authorize?";
    
    //Our API Key/client id for twitch.tv
    const CLIENT_ID_TWITCH = "c6pext763cxzkkw9ox5e3map72jtd8";

    const CLIENT_SECRET = "8ieeydcekh54lob7td6ie09nphcv5r"

    //An example API call to mixer getting specific channel information
    const BASE_URL_MIXER = "https://mixer.com/api/v1/channels/";

    // An API to get user follow
    const GET_URL_FOLLOW = "https://api.twitch.tv/kraken/users/<user ID>/follows/channels";

    const MIXER_URL = "https://www.mixer.com/";
    const TWITCH_URL = "https://www.twitch.com/";

    //Get the button to add streamer, and run streamSelected() on click
    const addStreamButton = document.getElementById("addStreamButton");
    addStreamButton.addEventListener('click', streamSelected);
    //let tableRef = document.getElementById("onlineStreamersTable");
    let streamersArray = [ ];


    function buildTable() {
        //Array of usernames for multiple users in 1 api call
        let onlineStreamers = [];
        //Get streamers in background, push to table
        chrome.storage.sync.get(function(result) {
            console.log("Getting array of streamers at startup...\n");
            if(Object.keys(result).length > 0) {
                streamersArray = result.streamersArray;
                
                console.log("Printing streamersArray after pushing data from storage...");
                console.log(streamersArray);
            }

            let user = streamersArray.filter(item => item.username);
            for(i = 0; i < user.length; i++){
                //console.log(user[i].username);
                if(user[i].url === MIXER_URL+user[i].username)
                    getStreamerMixer(user[i].username);
                else
                    getStreamerTwitch(user[i].username);
            }
        });
    }

    buildTable();
async function getOauthToken() {
    const reponse = await fetch("https://id.twitch.tv/oauth2/token?client_id=" + CLIENT_ID_TWITCH + "&client_secret=" + CLIENT_SECRET + "&grant_type=client_credentials", {
        method : "POST",

    })
    .then((response) => response.json())
    .then(data => {
        console.log(data);
    })
}


    //Helper function to check if user exists in array
    function userExists(username) {
        return streamersArray.some(function(el) {
          return el.username === username;
        }); 
      }

    //Helper function to get data in textbox
    function getName() {
        const user = document.querySelector("#streamId").value;
        return user;
    }


    function streamSelected() {
        let ele = document.getElementsByName('website');

        for (i = 0; i < ele.length; i++) {
            if (ele[i].checked) {
                switch (ele[i].value) {
                    case "twitch":
                        getStreamerTwitch(getName());
                        return;
                    case "mixer":
                        getStreamerMixer(getName());
                        return;
                }
            }
        }
    }

    


    //Function to get streamer data from Twitch's API
    /* Twitch seems to require that the client-id be in the Javascript Header Object, more info on those:
       https://developer.mozilla.org/en-US/docs/Web/API/Headers
       https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch */
    async function getStreamerTwitch(user) {
        console.log("Calling twitch api for user: " + user);

        fetch(BASE_URL_TWITCH + user, {
            method: 'GET', // or 'PUT'
            headers: {
                //'Content-Type': 'application/json',
                'Client-ID': CLIENT_ID_TWITCH,
                'redirect_uri' : 'https://localhost:8080',
                'Authorization' : 'Bearer ovsqw55cpw3phtjg5ekmrradkmr98b',

            },
        })
            .then((response) => response.json())
            .then((user) => {
                //console.log('Success:', user);

                //Placing JSON array object into obj for better readability later
                const obj = user.data[0];
                if (obj === undefined) {
                    console.log("Offline");
                } else {
                    
                    //Check to see if user is already in the local streamersArray before adding
                    if(!userExists(obj.user_name)) {
                        console.log("User does not exist in array...");
                        addStreamer(obj.type, obj.user_name, obj.viewer_count, TWITCH_URL + obj.user_name);

                    } else if(userExists(obj.user_name)) {
                        updateStreamer(obj.type, obj.user_name, obj.viewer_count, TWITCH_URL + obj.user_name);
                    }

                    chrome.storage.local.get(function(result) {
                        if (Object.keys(result).length > 0 && result.streamersArray) {
                            // The streamer array already exists, add to it the status, username, and viewers
                            //console.log("Printing local streamers array...\n");
                            //console.log(streamersArray);
                            result.streamersArray = {streamersArray};

                        } else {
                            // The data array doesn't exist yet, create it
                            result.streamersArray = [{ status: obj.type, username: obj.user_name, viewers : obj.user_name, url : TWITCH_URL + obj.user_name }];
                        }

                        // Now save the updated items using set
                        chrome.storage.sync.set({streamersArray}, function() {
                            //console.log(result);
                            //console.log('Data successfully saved to the storage!');
                        });

                    });
                }
            })
    }

    //Function to get streamer data from Mixer's API
    async function getStreamerMixer(user) {
        console.log("Calling mixer api for user: " + user);

        fetch(BASE_URL_MIXER + user, {
            method: 'GET', // or 'PUT'
            headers: {
                'Content-Type': 'application/json',
                
                //'x-ratelimit-remaining': 'application/json',
            },
        })
            .then((response) => response.json())
            .then((user) => {
                //console.log('Success:', user);

                //User is already a parsed JSON object, can access data directly and check if user.online === true
                if (user.online === true) {

                    //Check to see if user is already in the local streamersArray before adding
                    if(!userExists(user.token)) {
                        console.log("User does not exist in array...");
                        addStreamer(user.online, user.token, user.viewersCurrent, MIXER_URL + user.token);

                    } else if(userExists(user.token)) {
                        updateStreamer(user.online, user.token, user.viewersCurrent, MIXER_URL + user.token);
                    }

                    chrome.storage.local.get(function(result) {
                        if (Object.keys(result).length > 0 && result.streamersArray) {
                            // The streamer array already exists, add to it the status, username, and viewers
                            //console.log("Printing local streamers array...\n");
                            //console.log(streamersArray);
                            result.streamersArray = {streamersArray};

                        } else {
                            // The data array doesn't exist yet, create it
                            result.streamersArray = [{ status: user.online, username: user.token, viewers : user.viewersCurrent, url : MIXER_URL + user.token }];
                        }

                        // Now save the updated items using set
                        chrome.storage.sync.set({streamersArray}, function() {
                            //console.log(result);
                            //console.log('Data successfully saved to the storage!');
                        });

                    });

                } else {
                    console.log(user.token + " is Offline"); 

                }
            })
    }
    //Used to update table on startup, no need to push user to streamersArray, already exists
    function updateStreamer(status, username, viewers, site) {
        let tableRef = document.getElementById("onlineStreamersTable");
        let row = tableRef.insertRow(1);
        let statusCell = row.insertCell(0);
        let rowCell = row.insertCell(1);
        let viewerCell = row.insertCell(2);
        statusCell.innerHTML = "Online";
        rowCell.innerHTML = username;
        viewerCell.innerHTML = viewers;
    }
    //Used to add a new streamer to the table
    function addStreamer(status, username, viewers, site) {
        let tableRef = document.getElementById("onlineStreamersTable");
        let row = tableRef.insertRow(1);
        let statusCell = row.insertCell(0);
        let rowCell = row.insertCell(1);
        let viewerCell = row.insertCell(2);
        statusCell.innerHTML = "Online";
        rowCell.innerHTML = username;
        viewerCell.innerHTML = viewers;

        streamersArray.push({status: status, username: username, viewers: viewers, url : site});
    }

    //Function to test if properly storing streamer data
    const show = document.getElementById("showButton");
    show.addEventListener('click', showStreamers);

    function showStreamers() {

        console.log("Showing streamers in storage array...\n");
        chrome.storage.sync.get(function(result) {
            console.log(result);
        });
    }

    //Function used to open streamer's link in tab
    function popOut(link) {
        chrome.tabs.create({url : link});
    }

    //Function to get new oauth token
    const tokenButton = document.getElementById("tokenButton");
    tokenButton.addEventListener('click', getOauthToken);


    //Get the followers of a twitch account
    function getFollowers(name) {
        return new Promise((resolve, reject) => {
            request({GET_URL_FOLLOW, json: true}, (err, resp, body) => {
                if (err == true) {
                    reject(err)
                }

                const PEOPLE_FOLLOWERS = body.follows.map(follower => {
                    return {id: follower.user.id, name: follower.user.name}
                })
                resolve(PEOPLE_FOLLOWERS)
            })
        })

    }

}