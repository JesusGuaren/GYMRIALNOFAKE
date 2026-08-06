import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

// Red de seguridad para crashes en producción: sin esto, un error de render
// deja al usuario con una pantalla en blanco sin forma de recuperarse.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled render error:', error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center bg-slate-950 px-8">
          <Text className="text-white text-lg font-bold text-center mb-2">
            Algo salió mal
          </Text>
          <Text className="text-slate-400 text-sm text-center mb-6">
            Ocurrió un error inesperado. Tus datos ya guardados están a salvo.
          </Text>
          <TouchableOpacity
            onPress={this.handleReset}
            className="bg-blue-600 px-6 py-3 rounded-full"
          >
            <Text className="text-white font-bold">Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}
