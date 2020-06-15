window.onload = function () {
    const BASE_URL_TWITCH = "https://api.twitch.tv/helix/streams?user_login=";
    const BASE_URL_TWITCH_MULT = "https://api.twitch.tv/helix/streams?";

    //Our API Key/client id for twitch.tv
    const CLIENT_ID_TWITCH = "c6pext763cxzkkw9ox5e3map72jtd8";

    const CLIENT_SECRET = "8ieeydcekh54lob7td6ie09nphcv5r"

    //An example API call to mixer getting specific channel information
    const BASE_URL_MIXER = "https://mixer.com/api/v1/channels/";

    // An API to get user follow
    const GET_URL_FOLLOW = "https://api.twitch.tv/kraken/users/<user ID>/follows/channels";

    const MIXER_URL = "https://www.mixer.com/";
    const TWITCH_URL = "https://www.twitch.com/";

    let oauthToken;

    //Get the button to add streamer to add new streamer
    const addStreamButton = document.getElementById("addStreamButton");
    addStreamButton.addEventListener('click', addStreamClicked);
    let streamersArray = [];
    //Empty strings to pass users into api
    let tempStrTwitch = "";
    let tempStrMixer = "";

    //Get oauth token at beginning of session then build table
    getOauthToken();

    //Function to get new oauth token
    //const tokenButton = document.getElementById("tokenButton");
    //tokenButton.addEventListener('click', getOauthToken);
    async function getOauthToken(callback) {
        const reponse = await fetch("https://id.twitch.tv/oauth2/token?client_id=" + CLIENT_ID_TWITCH + "&client_secret=" + CLIENT_SECRET + "&grant_type=client_credentials", {
            method: "POST",

        })
            .then((response) => response.json())
            .then(data => {
                oauthToken = data.access_token;
                buildTable();

            })
    }

    function buildTable() {
        //Get streamers in background, push to table
        chrome.storage.sync.get(function (result) {
            if (Object.keys(result).length > 0) {
                streamersArray = result.streamersArray;

                console.log(streamersArray);
                //Only show streamers that are online
                let live = streamersArray.filter(item => item.status);
                for (i = 0; i < live.length; i++) {
                    if (live[i].url === MIXER_URL + live[i].username) {
                        //tempStrMixer+=live[i].username + "&";
                        getStreamerMixer(live[i].username);
                    }
                    else {
                        tempStrTwitch += "&user_id=" + live[i].userid;

                    }
                }
                //getStreamerMixer(tempStrMixer)
                if (tempStrTwitch.length > 0)
                    getStreamerTwitch(BASE_URL_TWITCH_MULT + tempStrTwitch);
            }


        });
    }


    function addStreamClicked() {
        let ele = document.getElementsByName('website');

        for (i = 0; i < ele.length; i++) {
            if (ele[i].checked) {
                switch (ele[i].value) {
                    case "twitch":
                        getStreamerTwitch(BASE_URL_TWITCH + getNameFromField());
                        return;
                    case "mixer":
                        getStreamerMixer(getNameFromField());
                        return;
                }
            }
        }
    }

    //Function to get streamer data from Twitch's API
    async function getStreamerTwitch(user) {

        fetch(user, {
            method: 'GET', // or 'PUT'
            headers: {
                //'Content-Type': 'application/json',
                'Client-ID': CLIENT_ID_TWITCH,
                'redirect_uri': 'https://localhost:8080',
                'Authorization': 'Bearer ' + oauthToken,

            },
        })
            .then((response) => {
                if (response.status === 429) alert("There are too many requests, please try in 1 minute");
                return response.json()
            })
            .then((user) => {
                //console.log('Success:', user);

                //Placing JSON array object into obj for better readability later
                const obj = user.data[0];
                if (obj === undefined) {
                    //User is offline if undefined
                    let temp_name = getNameFromField();

                    if (!userExists(temp_name)) {
                        addStreamer("live", temp_name, temp_name, "offline", TWITCH_URL + temp_name);

                        saveToChromeStorage("live", temp_name, temp_name, 0, TWITCH_URL + temp_name);
                    }
                    //alert("Please ensure streamer is online before adding..");
                } else {

                    //Check to see if user is already in the local streamersArray before adding
                    if (!userExists(obj.user_name)) {
                        //console.log("User does not exist in array...");
                        addStreamer(obj.type, obj.user_name, obj.user_id, obj.viewer_count, TWITCH_URL + obj.user_name);

                    } else if (userExists(obj.user_name)) {
                        //Add all online users
                        user.data.forEach(element => updateTable(element.type, element.user_name, element.viewer_count, TWITCH_URL + element.user_name));
                        //updateTable(obj.type, obj.user_name, obj.viewer_count, TWITCH_URL + obj.user_name);
                    }

                    saveToChromeStorage(obj.type, obj.user_name, obj.user_id, obj.viewer_count, TWITCH_URL + obj.user_name)



                }
            })
    }

    //Function to get streamer data from Mixer's API
    async function getStreamerMixer(user) {

        fetch(BASE_URL_MIXER + user, {
            method: 'GET', // or 'PUT'
            headers: {
                'Content-Type': 'application/json',

                //'x-ratelimit-remaining': 'application/json',
            },
        })
            .then((response) => {
                if (response.status === 429) alert("There are too many requests, please try in 1 minute");
                return response.json()
            })
            .then((user) => {
                //console.log(user);
                //User is already a parsed JSON object, can access data directly and check if user.online === true
                if (user.online === true) {

                    //Check to see if user is already in the local streamersArray before adding
                    if (!userExists(user.token)) {
                        //User does not exist in array...
                        addStreamer(user.online, user.token, user.userId, user.viewersCurrent, MIXER_URL + user.token);

                    } else if (userExists(user.token)) {
                        updateTable(user.online, user.token, user.viewersCurrent, MIXER_URL + user.token);
                    }

                    saveToChromeStorage(user.online, user.token, user.userId, user.viewersCurrent, MIXER_URL + user.token);

                } else {
                    //User is offline
                    //alert("Please ensure streamer is online before adding..");

                }
            })
    }

    //Used to add a new streamer to the table
    function addStreamer(status, username, userid, viewers, site) {
        updateTable(status, username, viewers, site);

        streamersArray.push({ status: status, username: username, userid: userid, viewers: viewers, url: site });
    }

    //Images for the table
    let imgTwitch = "<img src='images/twitch16.png'/>"
    let imgMixer = "<img src='images/mixer16.png'/>"
    //Function to update table
    function updateTable(status, username, viewers, site) {
        let img = "";
        if (site == MIXER_URL + username)
            img = imgMixer;
        else
            img = imgTwitch;

        $(document).ready(function () {
            $("#onlineStreamersTable").append(
                "<tr>" +
                "<td>" + img + "</td>" +
                "<td class='hasLink' style='cursor:pointer' href='" + site + "'>" + username + "</td>" +
                "<td>" + viewers + "</td>" +
                "<td class='delete' id='" + username + "' style='cursor:pointer'>Hide</td>" +
                "</tr>"

            );

            $("td").click(function (e) {
                //Delete was clicked
                if ($(this).hasClass("delete")) {
                    //Deletes row from table element
                    $(this).closest("tr").remove();
                }
                else if ($(this).hasClass("hasLink")) {
                    //Username was clicked
                    popOut($(this).attr("href"));
                    e.cancelBubble();
                }
            })
        });

    }

    //Function to delete all background storage
    const deleteStreamButton = document.getElementById("deleteStreamButton");
    deleteStreamButton.addEventListener('click', deleteStreams);
    function deleteStreams() {
        let result = confirm("Are you sure you want to delete?");
        if (result) {
            for (i = 0; i < streamersArray.length; i++) {
                $("td").remove();
            }
            //Clears all chrome storage data
            chrome.storage.sync.clear(function () {
                var error = chrome.runtime.lastError;
                if (error) {
                    console.error(error);
                }
            });
        }
    }

    //Function to save to chrome storage api
    function saveToChromeStorage(status, username, userid, viewers, url) {
        chrome.storage.local.get(function (result) {
            if (Object.keys(result).length > 0 && result.streamersArray) {
                // The streamer array already exists, add to it the status, username, and viewers
                result.streamersArray = { streamersArray };

            } else {
                // The data array doesn't exist yet, create it
                result.streamersArray = [{ status: status, username: username, userid: userid, viewers: viewers, url: url }];
            }

            // Now save the updated items using set
            chrome.storage.sync.set({ streamersArray }, function () {
            });
        })
    }


    //Function used to open streamer's link in tab
    function popOut(link) {
        chrome.tabs.create({ url: link });
    }

    //Function to refresh existing token
    async function refreshOauthToken() {
        const reponse = await fetch("https://id.twitch.tv/oauth2/token--data-urlencode?grant_type=refresh_token&refresh_token=" + "ovyi14126918nmgrfhqhw5t9jupl8v" + "&client_id=" + CLIENT_ID_TWITCH + "&client_secret=" + CLIENT_SECRET, {
            method: "POST",

        })
            .then((response) => response.json())
            .then(data => {
                console.log(data);
            })
    }


    //Helper function to check if user exists in array
    function userExists(username) {
        return streamersArray.some(function (el) {
            return el.username === username;
        });
    }

    //Helper function to get data in textbox
    function getNameFromField() {
        const user = document.querySelector("#streamId").value;
        if (user === "") return alert("Please enter a streamer");
        if (userExists(user)) return alert("You are already following " + user);
        return user;
    }


}