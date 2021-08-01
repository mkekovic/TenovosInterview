import { useLazyQuery, useMutation } from '@apollo/react-hooks'
import AsyncStorage from '@react-native-community/async-storage'
import auth from '@react-native-firebase/auth'
import React, { useContext, useState, useEffect } from 'react'
import { Dimensions, ImageBackground, TextInput, TouchableOpacity, View } from 'react-native'
import { CustomButton, Logo, Popup, ThemeText, Spinner } from '../../Components'
import { UserContext } from '../../Context'
import { CreateBug, GetUser } from './API'
import { UpdateTokens } from '../../API/Mutations'
import messaging from '@react-native-firebase/messaging'
const BackgroundImage = require('../../../assets/loginBackground.jpg')
const PhonePlaceholder = 'Enter Phone Number'
const NewPhonePlaceholder = 'Enter New Phone Number'
const VerificationCodePlaceholder = 'Enter Code'
const ResetEmailPlaceholder = 'Email'
const emailRegex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
const RESEND_TIMER = 10
let { height, width, fontScale } = Dimensions.get('window')
import Iaphub from 'react-native-iaphub'

export default function Login({ navigation: { navigate } }) {
  const [phone, setPhone] = useState(null)
  const [email, setEmail] = useState(null)
  const [code, setCode] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [invalids, setInvalids] = useState([])
  const [confirm, setConfirm] = useState(null)
  const [isPhoneNumberNew, setIsPhoneNumberNew] = useState(false)
  const [newPhoneNumber, setNewPhoneNumber] = useState(null)
  const [timer, setTimer] = useState({ visible: false, cd: 0 })

  const { setUser } = useContext(UserContext)

  const [createBug] = useMutation(CreateBug)

  useEffect(() => {
    if (timer.visible) {
      let timeNow = RESEND_TIMER
      const intervalFunc = setInterval(() => {
        timeNow = timeNow - 1
        if (timeNow <= RESEND_TIMER && timeNow > 0) setTimer({ ...timer, cd: timeNow })
        else {
          clearInterval(intervalFunc)
          setTimer({ cd: 0, visible: false })
        }
      }, 1000)
    }
  }, [timer.visible])
  // Calls firebase to register the device with messaging
  async function getToken() {
    // Register the device with FCM
    await messaging().registerDeviceForRemoteMessages()

    // Get the token
    return await messaging().getToken()
  }
  // Updates the chat tokens on the user
  const [updateUserToken] = useMutation(UpdateTokens)
  // If the code is typed in it calls to verify it otherwise sets invalid
  async function confirmCode() {
    // if code field is empty
    if (!code) {
      if (!invalids.includes(VerificationCodePlaceholder)) setInvalids([...invalids, VerificationCodePlaceholder])
      return
    }
    try {
      const { user } = await confirm.confirm(code)
      getUser({ variables: { firebaseID: user.uid } })
    } catch (error) {
      console.log({ phone, code })
      createBug({ variables: { message: error.message, date: new Date(), phone } })
      if (!invalids.includes(VerificationCodePlaceholder)) setInvalids([...invalids, VerificationCodePlaceholder])
    }
  }

  const [getUser, { loading: getUserLoading }] = useLazyQuery(GetUser, {
    onCompleted: async ({ getUserByFirebaseID }) => {
      if (getUserByFirebaseID) {
        await AsyncStorage.setItem('_id', getUserByFirebaseID._id)
        const currentTokens = [...getUserByFirebaseID.tokens]
        const newToken = await getToken()
        if (!currentTokens.includes(newToken))
          updateUserToken({ variables: { user: { _id: getUserByFirebaseID._id, tokens: [...currentTokens, newToken] } } })

        await Iaphub.setUserId(getUserByFirebaseID._id)
        await Iaphub.setUserTags({ gender: getUserByFirebaseID.gender })
        setUser(getUserByFirebaseID)
        navigate('Drawer', { userID: getUserByFirebaseID._id })
      } else {
        let { uid: firebaseID, phoneNumber: phone } = auth().currentUser
        navigate('Registration', { firebaseID, phone })
      }
    },
  })
  // Used to validate email
  function validateEmail() {
    return emailRegex.test(String(email).toLowerCase())
  }
  // Mini component to render the input
  function renderInput(placeholder, state, setState) {
    let autoCompleteType = 'off'
    let keyboardType = 'default'
    let textContentType = 'none'
    let maxLength = 10
    if (placeholder == PhonePlaceholder || placeholder == NewPhonePlaceholder) {
      autoCompleteType = 'tel'
      keyboardType = 'phone-pad'
      textContentType = 'telephoneNumber'
    } else if (placeholder == VerificationCodePlaceholder) {
      keyboardType = 'phone-pad'
      textContentType = 'oneTimeCode'
      maxLength = 6
    } else if (placeholder == ResetEmailPlaceholder) {
      autoCompleteType = 'email'
      keyboardType = 'email-address'
      textContentType = 'emailAddress'
      maxLength = 40
    }
    return (
      <View
        style={{
          backgroundColor: 'rgba(255,255,255, .55)',
          height: height * 0.06,
          width: width * 0.7,
          justifyContent: 'center',
          marginVertical: height * 0.01,
          borderRadius: height * 0.025,
          borderColor: !invalids.includes(placeholder) ? 'transparent' : 'red',
          borderWidth: 2,
        }}>
        <TextInput
          style={{ flex: 1, color: 'black', fontSize: 16 * fontScale, paddingLeft: 11 }}
          placeholderTextColor="white"
          returnKeyType={'done'}
          clearButtonMode={'always'}
          multiline={false}
          value={state}
          placeholder={placeholder}
          autoCompleteType={autoCompleteType} //iOS only :(
          keyboardType={keyboardType}
          maxLength={maxLength}
          onChangeText={(text) => {
            if (invalids.includes(placeholder)) setInvalids(invalids.filter((string) => placeholder !== string))
            setState(text)
          }}
          blurOnSubmit
          textContentType={textContentType} //iOS only :(
        />
      </View>
    )
  }
  // Renders the popup displaying the error
  function renderErrorPopup() {
    return (
      <Popup
        titleText={'Error'}
        isVisible={!!error}
        onClose={() => setError(null)}
        wrap
        wrapContent={
          <View style={{ minHeight: height * 0.15, justifyContent: 'space-around', alignContent: 'center' }}>
            <ThemeText type={'header'} text={error} style={{ textAlign: 'center' }} />
            <CustomButton text={'Okay'} style={{ marginVertical: height * 0.02 }} onButtonPress={() => setError(null)} type={'primary'} />
          </View>
        }
      />
    )
  }
  // Resetting the phone number
  async function handleNewPhoneNumber() {
    // TODO

    createBug({ variables: { message: 'Phone Number Changed', date: new Date(), phone, newPhoneNumber, email } })
    setIsPhoneNumberNew(null)
    alert('A representative will contact you shortly to validate your request.')
  }
  // Renders the popup containing fields to reset the phone number
  function newPhoneNumberPopup() {
    return (
      <Popup
        titleText={'New Phone Number'}
        isVisible={isPhoneNumberNew}
        onClose={() => setIsPhoneNumberNew(null)}
        wrap
        wrapContent={
          <View style={{ minHeight: height * 0.3, alignItems: 'center', justifyContent: 'space-around', marginVertical: height * 0.01 }}>
            <ThemeText
              type={'header'}
              text={'Please enter the email associated with your account.'}
              style={{ textAlign: 'center', marginHorizontal: '5%' }}
            />
            {renderInput('Email', email, setEmail)}
            {renderInput(PhonePlaceholder, phone, setPhone)}
            {renderInput(NewPhonePlaceholder, newPhoneNumber, setNewPhoneNumber)}
            {/* Renders the button only if everything is correct */}
            {validateEmail() && !!phone && phone.length == 10 && !!newPhoneNumber && newPhoneNumber.length == 10 && (
              <CustomButton
                text={'Change Phone Number'}
                style={{ marginVertical: height * 0.01 }}
                onButtonPress={handleNewPhoneNumber}
                type={'primary'}
              />
            )}
          </View>
        }
      />
    )
  }
  // adds or removes the error with invalid phone number
  function inputIsValid() {
    if (!phoneNumberIsValid()) {
      if (!invalids.includes(PhonePlaceholder)) setInvalids([...invalids, PhonePlaceholder])
      return false
    } else {
      if (invalids.includes(PhonePlaceholder)) setInvalids(invalids.filter((string) => string != PhonePlaceholder))
    }

    return true
  }
  // Function to send the code after pressing submit
  async function sendCode() {
    try {
      setLoading(true) // sets loading to true for the rendering of the loader
      setCode(null) // cleans the code placeholder
      const confirmation = await auth().signInWithPhoneNumber('+1' + phone, true) // calling auth function of firebase to send a code to a user
      setConfirm(confirmation)
      setLoading(false)
      setTimer({ ...timer, visible: true })
    } catch (error) {
      console.log({ error })
      if (error.code === 'auth/invalid-phone-number') {
        setError('Double check that your phone number is typed correctly.')
        if (!invalids.includes(PhonePlaceholder)) setInvalids([...invalids, PhonePlaceholder])
      } else if (error.code === 'auth/quota-exceeded') {
        setError("It's a busy day for PlayerWatch login services. Please try again later.")
      } else if (error.code === 'auth/user-disabled') {
        setError('It appears you account has been disabled. Please contact support.')
      } else if (error.code === 'auth/too-many-requests') {
        setError('It appears your device has requested an an unusually high number of codes recently. Please try again later.')
      } else {
        setError('There was an error processing your request. Please try again later')
      }
    } finally {
      setLoading(false)
      setCode(null)
    }
  }
  // Handles the pressing of the button
  async function handleLoginPressed() {
    if (inputIsValid()) {
      sendCode()
    }
  }
  // Checking if the phone number is valid length
  function phoneNumberIsValid() {
    return !!phone && phone.length == 10
  }
  // Renders the login button 10 seconds after code is requested
  function renderButton() {
    let text = 'Send Code'
    let onPress = handleLoginPressed
    if (!!confirm && phoneNumberIsValid()) {
      text = 'Login'
      onPress = confirmCode
    }

    return <CustomButton text={text} onButtonPress={onPress} type={'primary'} />
  }
  // After the timer expires it renders the button to resent the code
  function renderResendCodeButton() {
    if (timer.cd) return <ThemeText type={'header'} text={`Resend Code in ${timer.cd}...`} />
    else
      return (
        <TouchableOpacity onPress={sendCode} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ThemeText type={'header'} text={'Resend Code'} style={{ textDecorationLine: 'underline' }} />
        </TouchableOpacity>
      )
  }

  return (
    <ImageBackground source={BackgroundImage} style={{ flex: 1, alignItems: 'center' }} imageStyle={{ resizeMode: 'cover' }}>
      {renderErrorPopup()}
      {newPhoneNumberPopup()}
      <View style={{ height: '30%', justifyContent: 'center' }}>
        <Logo size={100 * fontScale} />
      </View>

      <View style={{ alignItems: 'center', justifyContent: 'space-around', height: '30%' }}>
        {renderInput(PhonePlaceholder, phone, setPhone)}
        {phoneNumberIsValid() && !!confirm && renderResendCodeButton()}
        {phoneNumberIsValid() && !!confirm && renderInput(VerificationCodePlaceholder, code, setCode)}
        {!(loading || getUserLoading) ? renderButton() : <Spinner />}
      </View>
      <TouchableOpacity
        onPress={() => setIsPhoneNumberNew(true)}
      >
        <ThemeText
          type={'header'}
          text={'I have a new phone number'}
          style={{ marginTop: height * 0.03, textDecorationLine: 'underline' }}
        />
      </TouchableOpacity>
    </ImageBackground>
  )
}
