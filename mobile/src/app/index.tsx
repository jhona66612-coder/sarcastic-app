import { useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

const api = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');

async function solicitar(ruta: string, opciones: RequestInit = {}) {
  if (!api) throw new Error('Configura EXPO_PUBLIC_API_URL en mobile/.env y recarga la app.');
  const respuesta = await fetch(api + ruta, opciones);
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.error || 'Error HTTP ' + respuesta.status);
  return datos;
}

type Tarea = { id: string; title: string };

export default function Conexion() {
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [titulo, setTitulo] = useState('');
  const [token, setToken] = useState('');
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [mensaje, setMensaje] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function ejecutar(accion: () => Promise<void>) {
    setOcupado(true);
    try {
      await accion();
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : 'Revisa la conexión con Express.');
    } finally {
      setOcupado(false);
    }
  }

  async function probar() {
    const datos = await solicitar('/db-check');
    setMensaje('Supabase conectado. Usuarios registrados: ' + datos.users);
  }

  async function entrar() {
    const sesion = await solicitar('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: correo.trim(), password: clave }),
    });
    setToken(sesion.token);
    setClave('');
    const lista = await solicitar('/tasks', {
      headers: { Authorization: 'Bearer ' + sesion.token },
    });
    setTareas(lista);
    setMensaje('Sesión iniciada como ' + sesion.user.name + '.');
  }

  async function agregar() {
    const tarea: Tarea = await solicitar('/tasks', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: titulo.trim(), priority: 'ordinary' }),
    });
    setTareas((anteriores) => [tarea, ...anteriores]);
    setTitulo('');
    setMensaje('Tarea guardada en Supabase.');
  }

  function salir() {
    setToken('');
    setTareas([]);
    setTitulo('');
    setMensaje('Sesión cerrada.');
  }

  return (
    <ScrollView contentContainerStyle={estilos.pagina} keyboardShouldPersistTaps="handled">
      <Text style={estilos.titulo}>Mis tareas</Text>
      <Button title="Probar conexión" disabled={ocupado} onPress={() => ejecutar(probar)} />
      {token ? (
        <View style={estilos.grupo}>
          <Text>Nueva tarea</Text>
          <TextInput style={estilos.campo} value={titulo} onChangeText={setTitulo} />
          <Button title="Guardar tarea" disabled={ocupado || !titulo.trim()}
            onPress={() => ejecutar(agregar)} />
          {tareas.map((tarea) => <Text key={tarea.id}>{tarea.title}</Text>)}
          <Button title="Cerrar sesión" disabled={ocupado} onPress={salir} />
        </View>
      ) : (
        <View style={estilos.grupo}>
          <Text>Correo de prueba</Text>
          <TextInput style={estilos.campo} value={correo} onChangeText={setCorreo}
            autoCapitalize="none" autoCorrect={false} keyboardType="email-address" />
          <Text>Contraseña</Text>
          <TextInput style={estilos.campo} value={clave} onChangeText={setClave}
            secureTextEntry autoCapitalize="none" />
          <Button title="Iniciar sesión" disabled={ocupado || !correo.trim() || !clave}
            onPress={() => ejecutar(entrar)} />
        </View>
      )}
      <Text accessibilityLiveRegion="polite">{mensaje}</Text>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pagina: { padding: 24, paddingTop: 64, gap: 18, backgroundColor: '#ffffff', flexGrow: 1 },
  titulo: { fontSize: 30, fontWeight: '700', color: '#16392f' },
  grupo: { gap: 10 },
  campo: { padding: 10, borderColor: '#58776c', borderWidth: 1, borderRadius: 6 },
});
