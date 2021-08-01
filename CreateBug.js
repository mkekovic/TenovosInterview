import gql from 'graphql-tag'
const CreateBug = gql`
  mutation CreateBug($message: String!, $date: String!, $phone: String, $newPhoneNumber: String, $email: String) {
    createBug(message: $message, date: $date, phone: $phone, new_phone: $newPhoneNumber, email: $email)
  }
`
export default CreateBug
