// pime-audio — lista dispositivos de audio y crea el "Dispositivo de salida
// múltiple" (audífonos + BlackHole) que necesita el modo «Micrófono + audio del
// sistema» de PimeMeet.
//
// Crear el dispositivo a mano son seis clics en Configuración de Audio MIDI;
// esto hace lo mismo por CoreAudio, sin GUI y sin sudo, porque los dispositivos
// agregados son por usuario.
//
//   pime-audio list
//   pime-audio create "<UID salida 1>" "<UID salida 2>" ["Nombre"]

import CoreAudio
import Foundation

let MAIN = kAudioObjectPropertyElementMain

func devices() -> [AudioDeviceID] {
    var address = AudioObjectPropertyAddress(
        mSelector: kAudioHardwarePropertyDevices,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: MAIN)
    var size: UInt32 = 0
    guard AudioObjectGetPropertyDataSize(
        AudioObjectID(kAudioObjectSystemObject), &address, 0, nil, &size) == noErr else { return [] }
    var ids = [AudioDeviceID](repeating: 0, count: Int(size) / MemoryLayout<AudioDeviceID>.size)
    guard AudioObjectGetPropertyData(
        AudioObjectID(kAudioObjectSystemObject), &address, 0, nil, &size, &ids) == noErr else { return [] }
    return ids
}

func stringProperty(_ id: AudioDeviceID, _ selector: AudioObjectPropertySelector) -> String? {
    var address = AudioObjectPropertyAddress(
        mSelector: selector, mScope: kAudioObjectPropertyScopeGlobal, mElement: MAIN)
    var size = UInt32(MemoryLayout<CFString?>.size)
    var value: CFString? = nil
    let status = withUnsafeMutablePointer(to: &value) {
        AudioObjectGetPropertyData(id, &address, 0, nil, &size, $0)
    }
    guard status == noErr, let value else { return nil }
    return value as String
}

/// Canales de salida. Un dispositivo con cero no sirve como destino de audio.
func outputChannels(_ id: AudioDeviceID) -> Int {
    var address = AudioObjectPropertyAddress(
        mSelector: kAudioDevicePropertyStreamConfiguration,
        mScope: kAudioDevicePropertyScopeOutput,
        mElement: MAIN)
    var size: UInt32 = 0
    guard AudioObjectGetPropertyDataSize(id, &address, 0, nil, &size) == noErr, size > 0 else { return 0 }

    let buffer = UnsafeMutableRawPointer.allocate(
        byteCount: Int(size), alignment: MemoryLayout<AudioBufferList>.alignment)
    defer { buffer.deallocate() }
    guard AudioObjectGetPropertyData(id, &address, 0, nil, &size, buffer) == noErr else { return 0 }

    let list = UnsafeMutableAudioBufferListPointer(buffer.assumingMemoryBound(to: AudioBufferList.self))
    return list.reduce(0) { $0 + Int($1.mNumberChannels) }
}

func listDevices() {
    print("Salidas disponibles (UID → nombre, canales):\n")
    for id in devices() {
        let channels = outputChannels(id)
        guard channels > 0 else { continue }
        let name = stringProperty(id, kAudioObjectPropertyName) ?? "(sin nombre)"
        let uid = stringProperty(id, kAudioDevicePropertyDeviceUID) ?? "(sin uid)"
        print("  \(uid)\n      \(name) — \(channels) canales")
    }
}

func createMultiOutput(subUIDs: [String], name: String) -> Int32 {
    let uid = "com.pime.meet.multioutput"

    // Un dispositivo con el mismo UID de una corrida anterior se retira primero,
    // para que volver a ejecutar esto no acumule duplicados en el sistema.
    for id in devices() where stringProperty(id, kAudioDevicePropertyDeviceUID) == uid {
        AudioHardwareDestroyAggregateDevice(id)
    }

    let description: [String: Any] = [
        kAudioAggregateDeviceNameKey: name,
        kAudioAggregateDeviceUIDKey: uid,
        kAudioAggregateDeviceSubDeviceListKey: subUIDs.map { [kAudioSubDeviceUIDKey: $0] },
        // El primero manda el reloj: conviene que sea el dispositivo físico.
        kAudioAggregateDeviceMasterSubDeviceKey: subUIDs[0],
        // "Stacked" es lo que lo convierte en Salida múltiple y no en Agregado.
        kAudioAggregateDeviceIsStackedKey: 1,
        // Público: aparece en Configuración de Audio MIDI y sobrevive al reinicio.
        kAudioAggregateDeviceIsPrivateKey: 0,
    ]

    var deviceID = AudioDeviceID(0)
    let status = AudioHardwareCreateAggregateDevice(description as CFDictionary, &deviceID)
    if status == noErr {
        print("✓ Creado «\(name)» (id \(deviceID)) con: \(subUIDs.joined(separator: ", "))")
    } else {
        print("✗ CoreAudio devolvió el error \(status)")
    }
    return status
}

/// Fija la salida por defecto del sistema. Es el último paso: de nada sirve el
/// dispositivo múltiple si la llamada sigue sonando solo por los altavoces.
func setDefaultOutput(uid: String) -> Int32 {
    guard let device = devices().first(where: {
        stringProperty($0, kAudioDevicePropertyDeviceUID) == uid
    }) else {
        print("✗ No hay ninguna salida con el UID \(uid)")
        return -1
    }

    var address = AudioObjectPropertyAddress(
        mSelector: kAudioHardwarePropertyDefaultOutputDevice,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: MAIN)
    var id = device
    let status = AudioObjectSetPropertyData(
        AudioObjectID(kAudioObjectSystemObject), &address, 0, nil,
        UInt32(MemoryLayout<AudioDeviceID>.size), &id)

    let name = stringProperty(device, kAudioObjectPropertyName) ?? uid
    print(status == noErr ? "✓ Salida del sistema: \(name)" : "✗ CoreAudio devolvió el error \(status)")
    return status
}

let AGGREGATE_UID = "com.pime.meet.multioutput"
let BLACKHOLE_UID = "BlackHole2ch_UID"

func transportType(_ id: AudioDeviceID) -> UInt32 {
    var address = AudioObjectPropertyAddress(
        mSelector: kAudioDevicePropertyTransportType,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: MAIN)
    var value: UInt32 = 0
    var size = UInt32(MemoryLayout<UInt32>.size)
    guard AudioObjectGetPropertyData(id, &address, 0, nil, &size, &value) == noErr else { return 0 }
    return value
}

func defaultOutput() -> AudioDeviceID? {
    var address = AudioObjectPropertyAddress(
        mSelector: kAudioHardwarePropertyDefaultOutputDevice,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: MAIN)
    var id = AudioDeviceID(0)
    var size = UInt32(MemoryLayout<AudioDeviceID>.size)
    guard AudioObjectGetPropertyData(
        AudioObjectID(kAudioObjectSystemObject), &address, 0, nil, &size, &id) == noErr else { return nil }
    return id
}

/// Salidas físicas por las que la persona podría estar escuchando: se descartan
/// BlackHole (que no suena en ningún lado) y nuestro propio dispositivo múltiple.
func physicalOutputs() -> [AudioDeviceID] {
    devices().filter { id in
        guard outputChannels(id) > 0 else { return false }
        let uid = stringProperty(id, kAudioDevicePropertyDeviceUID) ?? ""
        return uid != BLACKHOLE_UID && uid != AGGREGATE_UID
    }
}

/// Por dónde escucha ahora mismo.
///
/// Con AirPods puestos, macOS ya los tiene de salida por defecto, así que en el
/// caso normal basta con respetar esa elección. Si la salida por defecto es
/// nuestro propio dispositivo múltiple —porque quedó puesto de una grabación
/// anterior— hay que mirar el hardware: se prefiere un dispositivo externo
/// (audífonos) y, si no hay, los altavoces integrados.
func preferredOutput() -> AudioDeviceID? {
    let candidates = physicalOutputs()
    if let current = defaultOutput(), candidates.contains(current) { return current }
    if let external = candidates.first(where: { transportType($0) != kAudioDeviceTransportTypeBuiltIn }) {
        return external
    }
    return candidates.first
}

/// Deja el Mac listo para grabar los dos canales, con o sin audífonos.
func setup() -> Int32 {
    guard devices().contains(where: {
        stringProperty($0, kAudioDevicePropertyDeviceUID) == BLACKHOLE_UID
    }) else {
        print("✗ BlackHole no está instalado o CoreAudio no lo ve.")
        return -1
    }
    guard let output = preferredOutput(),
          let outputUID = stringProperty(output, kAudioDevicePropertyDeviceUID) else {
        print("✗ No encontré ninguna salida física por la que estés escuchando.")
        return -1
    }

    let outputName = stringProperty(output, kAudioObjectPropertyName) ?? outputUID
    let external = transportType(output) != kAudioDeviceTransportTypeBuiltIn

    let status = createMultiOutput(
        subUIDs: [outputUID, BLACKHOLE_UID],
        name: "PimeMeet (\(outputName) + BlackHole)")
    guard status == noErr else { return status }

    let applied = setDefaultOutput(uid: AGGREGATE_UID)
    if applied == noErr {
        print(external
            ? "  Escuchas por \(outputName). Sin fuga al micrófono: los dos canales quedan limpios."
            : "  Escuchas por \(outputName), que es un altavoz: tu micrófono va a captar también al cliente. El pipeline descarta ese eco, pero con audífonos sale mejor.")
    }
    return applied
}

/// Devuelve la salida a un dispositivo normal al terminar de grabar: el
/// dispositivo múltiple no tiene control de volumen y molesta para el día a día.
func restore() -> Int32 {
    let candidates = physicalOutputs()
    guard let output = candidates.first(where: { transportType($0) != kAudioDeviceTransportTypeBuiltIn })
            ?? candidates.first,
          let uid = stringProperty(output, kAudioDevicePropertyDeviceUID) else {
        print("✗ No hay ninguna salida física a la que volver.")
        return -1
    }
    return setDefaultOutput(uid: uid)
}

let args = Array(CommandLine.arguments.dropFirst())
switch args.first {
case "list", nil:
    listDevices()
case "create":
    let rest = Array(args.dropFirst())
    guard rest.count >= 2 else {
        print("Uso: pime-audio create \"<UID 1>\" \"<UID 2>\" [\"Nombre\"]")
        exit(1)
    }
    let uids = Array(rest.prefix(2))
    let name = rest.count > 2 ? rest[2] : "PimeMeet (salida múltiple)"
    exit(createMultiOutput(subUIDs: uids, name: name) == noErr ? 0 : 1)
case "setup":
    exit(setup() == noErr ? 0 : 1)
case "restore":
    exit(restore() == noErr ? 0 : 1)
case "use":
    guard args.count >= 2 else {
        print("Uso: pime-audio use \"<UID>\"")
        exit(1)
    }
    exit(setDefaultOutput(uid: args[1]) == noErr ? 0 : 1)
default:
    print("Uso: pime-audio [setup | restore | list | create <UID 1> <UID 2> [nombre] | use <UID>]")
    exit(1)
}
