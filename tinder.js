// fetch lib as node http methods SUCK ASS `yarn add global node-fetch` etc
const fetch = require('node-fetch')
const fs = require('fs')
const util = require('util')
const writeToFile = util.promisify(fs.writeFile)

// x-auth-token - readme.md
const token = ''

//
// THIS IS TERRIBLE CODE
// IT MAY GET STUCK IF YOU HAVE A LOT OF MATCHES, TRY AGAIN
//

if (!token) {
  throw new Error('No token provided - read the README.md')
}

const headers = {
  'X-Auth-Token': token,
  'content-type': 'application/json',
  'User-agent': 'Tinder/7.5.3 (iPhone; iOS 10.3.2; Scale/2.00)'
}

const fetchData = async url => {
  try {
    console.log('Getting:', url)
    const res = await fetch(`https://api.gotinder.com/${url}`, { method: 'GET', headers })
    return await res.json()
  } catch (e) {
    console.log('Something broke', e)
  }
}

const getMatches = async messageType => {
  const matches = []

  const getMatchesInner = async (token = undefined) => {
    try {
      const tokenFrag = token ? `&page_token=${token}` : ''
      const matchRes = await fetchData(
        `v2/matches?count=60&is_tinder_u=false&locale=en-GB&message=${messageType}${tokenFrag}`
      )
      matches.push(...matchRes.data.matches.map(item => item.person._id))
      // if a token is returned, there are more results, loop its self until none left
      const tokenId = matchRes.data.next_page_token
      if (tokenId) {
        await getMatchesInner(tokenId)
      }
    } catch (e) {
      console.log(e)
    }
  }

  await getMatchesInner()

  return matches
}

const getProfile = async id => {
  const data = await fetchData(`user/${id}?locale=en-GB`)
  const { name, distance_mi } = data.results
  console.log(name)
  return { name, distance_mi }
}

// fix auth ? idk how to make work
// const auth = async () => {
// const facebook_id = 0
// const facebook_token = ''
// const authData = await fetchData('auth', 'POST', { facebook_token, facebook_id })
// const token = authData.data.token
// }

const run = async () => {
  // await auth()
  // the number here is 1 = matches with messages, 0 = matches with no messages
  const profile = await fetchData('/profile')
  const city = profile.pos_info.city.name
  const country = profile.pos_info.country.name
  console.log(profile)
  const firstMatches = await getMatches(1)
  const secondMatches = await getMatches(0)
  const allUniqeMatches = [...new Set([...firstMatches, ...secondMatches])]
  let userProfiles = []

  console.log(
    `Found ${allUniqeMatches.length} Matches - ${
      allUniqeMatches.length > 100 ? 'You stud' : 'Try harder'
    }`
  )
  // promise spams the APi too much, try async, slower but works for certain
  // const promisesList = allMatches.map(getProfile)
  // await Promise.all(promisesList)
  for (const [index, id] of allUniqeMatches.entries()) {
    console.log(index)
    const profile = await getProfile(id)
    userProfiles.push(profile)
    // do this inside the loop, its slow but it means if you got 1k matches and only make 500 its not pointless
    userProfiles = userProfiles.sort((a, b) => a.distance_mi - b.distance_mi)
    await writeToFile(`results/${country}_${city}.json`, JSON.stringify(userProfiles, null, 4))
  }

  console.log('DONE')
}

run()
