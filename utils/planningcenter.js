const fetch = require("isomorphic-fetch");

async function getPCCredentials(code) {
  let requestOptions = {
    method: "POST",
    redirect: "follow",
  };
  const data = await fetch(
    `https://api.planningcenteronline.com/oauth/token?&grant_type=authorization_code&code=${code}&client_id=${process.env.PCCLIENTID}&client_secret=${process.env.PCSECRET}&redirect_uri=${process.env.REDIRECTURI}`,
    requestOptions
  );
  const accessData = await data.json();
  return accessData;
}

async function getSongs(accessToken, title) {
  const query = title.split(" ").join("+");

  let requestOptions = {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    redirect: "follow",
  };

  const data = await fetch(
    `https://api.planningcenteronline.com/services/v2/songs?where[title]=${query}`,
    requestOptions
  );

  const songs = await data.json();

  return songs;
}

async function getSong(accessToken, id) {
  let requestOptions = {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    redirect: "follow",
  };

  const songFetch = await fetch(
    `https://api.planningcenteronline.com/services/v2/songs/${id}`,
    requestOptions
  );

  const songDataFetch = await fetch(
    `https://api.planningcenteronline.com/services/v2/songs/${id}/arrangements`,
    requestOptions
  );

  const song = await songFetch.json();
  const songData = await songDataFetch.json();

  const songObj = {
    title: song.data.attributes.title,
    data: songData.data[0],
  };

  return songObj;
}

async function getUser(accessToken) {
  try {
    const requestOptions = {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      redirect: "follow",
    };

    const data = await fetch(
      "https://api.planningcenteronline.com/services/v2/me",
      requestOptions
    );

    if (!data.ok) {
      // Handle non-JSON response (e.g., error page)
      const errorText = await data.text();
      console.error(`API error: ${data.status} - ${errorText}`);
      // Handle the error as needed
      return;
    }

    const user = await data.json();
    return user;
  } catch (err) {
    console.warn(err);
  }
}

module.exports = {
  getPCCredentials,
  getSongs,
  getSong,
  getUser,
};
