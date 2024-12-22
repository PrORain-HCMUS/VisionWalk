import { StyleSheet, Text, View } from 'react-native'
import React from 'react'

const NotFound = () => {
  return (
    <View>
      <Text>NotFound</Text>
    </View>
  )
}

export default NotFound

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#25292e",
        justifyContent: "center",
        alignItems: "center"
    },
    button: {
        fontSize: 20,
        textDecorationLine: "underline",
        color: "#fff"
    }
})