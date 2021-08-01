import gql from 'graphql-tag'
const GetUser = gql`
  query GetUserByFirebaseID($firebaseID: String!) {
    getUserByFirebaseID(firebaseID: $firebaseID) {
      _id
      banner
      first_name
      last_name
      thumbnail
      tokens
    }
  }
`
export default GetUser
