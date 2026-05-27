const {
  exchangeNpssoForAccessCode,
  exchangeAccessCodeForAuthTokens,
  exchangeRefreshTokenForAuthTokens,
  makeUniversalSearch,
  getProfileFromAccountId,
  getProfileFromUserName,
  getUserTitles: fetchUserTitles,
  getUserTrophiesForSpecificTitle,
  getUserTrophyProfileSummary: fetchUserTrophyProfileSummary,
  getTitleTrophies,
} = require("psn-api");

function buildAuth(accessToken) {
  if (!accessToken) {
    throw new Error("PSN accessToken is required");
  }
  return { accessToken };
}

async function authFromNpsso(npsso) {
  if (!npsso) {
    throw new Error("npsso is required");
  }

  const accessCode = await exchangeNpssoForAccessCode(npsso);
  return exchangeAccessCodeForAuthTokens(accessCode);
}

async function refreshAuth(refreshToken) {
  if (!refreshToken) {
    throw new Error("refreshToken is required");
  }

  return exchangeRefreshTokenForAuthTokens(refreshToken);
}

async function searchUser(query, accessToken) {
  return makeUniversalSearch(buildAuth(accessToken), query);
}

async function getProfileByAccountId(accountId, accessToken) {
  return getProfileFromAccountId(buildAuth(accessToken), accountId);
}

async function getProfileByUsername(username, accessToken) {
  return getProfileFromUserName(buildAuth(accessToken), username);
}

async function getMyTitles(accessToken) {
  return getUserTitles(accessToken, "me");
}

async function getUserTitles(accessToken, accountId) {
  return fetchUserTitles(buildAuth(accessToken), accountId);
}

async function getTrophiesForTitle(accountId, titleId, accessToken) {
  return getUserTrophiesForSpecificTitle(buildAuth(accessToken), accountId, { npTitleIds: titleId });
}

async function getTrophyProfileSummary(accountId, accessToken) {
  return fetchUserTrophyProfileSummary(buildAuth(accessToken), accountId);
}

async function getTitleTrophyDetails(titleId, accessToken) {
  return getTitleTrophies(buildAuth(accessToken), titleId);
}

module.exports = {
  authFromNpsso,
  refreshAuth,
  searchUser,
  getProfileByAccountId,
  getProfileByUsername,
  getMyTitles,
  getUserTitles,
  getTrophiesForTitle,
  getTrophyProfileSummary,
  getTitleTrophyDetails,
};
