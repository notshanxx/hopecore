import User from "../models/user.model.js";

// get data from env and store here
const GOOGLE_OAUTH_URL = process.env.GOOGLE_OAUTH_URL;

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const GOOGLE_CALLBACK_URL = "https%3A//hopecore.onrender.com/google/callback";

const GOOGLE_OAUTH_SCOPES = [
  "https%3A//www.googleapis.com/auth/userinfo.email",

  "https%3A//www.googleapis.com/auth/userinfo.profile",
];

const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const GOOGLE_ACCESS_TOKEN_URL = process.env.GOOGLE_ACCESS_TOKEN_URL;

/*
 * Handles the login route, if the user is already logged in, they are redirected to the dashboard.
 * Otherwise, they are redirected to the Google OAuth consent screen.
 */
export const loginController = async (req, res) => {
  // console.log(req.session.user);
  if (req.session.user) {
    return res.redirect("/dashboard"); // Redirect authenticated users to the dashboard
  }

  const state = "some_state";
  const scopes = GOOGLE_OAUTH_SCOPES.join(" ");
  const GOOGLE_OAUTH_CONSENT_SCREEN_URL = `${GOOGLE_OAUTH_URL}?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${GOOGLE_CALLBACK_URL}&access_type=offline&response_type=code&state=${state}&scope=${scopes}`;
  return res.render("login", { url: GOOGLE_OAUTH_CONSENT_SCREEN_URL });
};

export const callBack = async (req, res) => {
  // console.log(req.query);

  const { code } = req.query;

  const data = {
    code,

    client_id: GOOGLE_CLIENT_ID,

    client_secret: GOOGLE_CLIENT_SECRET,

    redirect_uri: "https://hopecore.onrender.com/google/callback",

    grant_type: "authorization_code",
  };

  // console.log(data);

  // exchange authorization code for access token & id_token

  const response = await fetch(GOOGLE_ACCESS_TOKEN_URL, {
    method: "POST",

    body: JSON.stringify(data),
  });

  const access_token_data = await response.json();

  const { id_token } = access_token_data; // a jwt token

  // console.log(id_token); 

  // verify and extract the information in the id token

  const token_info_response = await fetch(
    `${process.env.GOOGLE_TOKEN_INFO_URL}?id_token=${id_token}`
  );

  // all user information is in the id_token (it is a jwt token)
  const token_info_data = await token_info_response.json();
  // console.log(token_info_data);
  //   res.status(token_info_response.status).json(await token_info_response.json());
  //   console.log(token_info_data)

  const { email, name } = token_info_data;
  let user = await User.findOne({ email }).select("-password");
  if (!user) {
    user = await User.create({ email, name });
  }
  const token = user.generateToken();
  // store the user and the token in the session
  // the token is a jwt token that contains the user id
  // it is used to authenticate the user on subsequent requests
  req.session.user = token;

  // res.status(token_info_response.status).json({ user, token });
  return res.redirect("/dashboard");
};
