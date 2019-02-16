// fetch lib as node http methods SUCK ASS `yarn add global node-fetch` etc
const fetch = require('node-fetch')
const fs = require('fs')
const util = require('util')
const fs_writeFile = util.promisify(fs.writeFile)
const https = require('https')
const endPoint = 'https://api.gotinder.com'

// x-auth-token
const token = ''
// LOGIN TO TINDER WEB APP, OPEN DEV TOOLS, FIND MATCHES API REQUIRE GET THE TOKEN OUT THE GET HEADER

//
// THIS IS TERRIBLE CODE, I DONT CARE
// IT MAY GET STUCK IF YOU HAVE A LOT OF MATCHES, I DONT CARE EITHER
//

const allMatches = []
const allMatchesProfiles = []

const headers = {
  'X-Auth-Token': token,
  'content-type': 'application/json',
  'User-agent': 'Tinder/7.5.3 (iPhone; iOS 10.3.2; Scale/2.00)'
}

const fetchData = async url => {
  const res = await fetch(`${endPoint}/${url}`, { method: 'GET', headers })
  return await res.json()
}

const getMatches = async (token, message) => {
  try {
    const matches = await fetchData(
      `v2/matches?count=60&is_tinder_u=false&locale=en-GB&message=${message ? '0' : '1'}${
        token ? `&page_token=${token}` : ''
      }`
    )
    allMatches.push(...matches.data.matches.map(item => item.person._id))
    const tokenId = matches.data.next_page_token
    if (tokenId) {
      await getMatches(tokenId, message)
    }
  } catch (e) {
    console.log(`Error with: ${token}`)
  }
}

const getProfile = async id => {
  try {
    const data = await fetchData(`user/${id}?locale=en-GB`)
    const { name, distance_mi } = data.results
    console.log(name)
    allMatchesProfiles.push({ name, distance_mi })
  } catch (e) {
    console.log(`Error with ${id}`)
  }
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
  await getMatches()
  await getMatches(undefined, true)
  console.log(
    `Found ${allMatches.length} Matches - ${allMatches.length > 100 ? 'You stud' : 'Try harder'}`
  )
  // promise spams the APi too much, try async
  // const promisesList = allMatches.map(getProfile)
  // await Promise.all(promisesList)
  for (const [index, id] of allMatches.entries()) {
    console.log(index)
    await getProfile(id)
    // do this inside the loop, its slow but it mmeans if you got 1k matches and only make 500 its not pointless
    const sortData = allMatchesProfiles.sort((a, b) => a.distance_mi - b.distance_mi)
    await fs_writeFile('data.json', JSON.stringify(sortData, null, 4))
  }

  console.log('DONE')
}

run()
