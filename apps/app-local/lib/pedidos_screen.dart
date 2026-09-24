import 'dart:async';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'api.dart';
import 'session.dart';
import 'pedido_card.dart';

class PedidosScreen extends StatefulWidget {
  const PedidosScreen({super.key});

  @override
  State<PedidosScreen> createState() => _PedidosScreenState();
}

class _PedidosScreenState extends State<PedidosScreen> {
  final AudioPlayer _audioPlayer = AudioPlayer();
  final Set<String> _idsVistos = {};

  List<Map<String, dynamic>> _pedidos = [];
  bool _loading = true;
  String? _error;
  String? _restaurantId;
  Timer? _timer;
  bool _primeraCarga = true;

  @override
  void initState() {
    super.initState();
    _cargarRestaurantId();
  }

  Future<void> _cargarRestaurantId() async {
    final data = await Session.obtener();
    setState(() => _restaurantId = data['restaurantId']);

    if (_restaurantId != null && _restaurantId!.isNotEmpty) {
      await _cargarPedidos();
      // Polling cada 10s
      _timer = Timer.periodic(const Duration(seconds: 10), (_) {
        _cargarPedidos(silencioso: true);
      });
    } else {
      setState(() {
        _loading = false;
        _error = 'No se encontró el restaurante';
      });
    }
  }

  Future<void> _cargarPedidos({bool silencioso = false}) async {
    if (_restaurantId == null) return;

    try {
      final res = await Api.get(
        '/api/pedidos/local/$_restaurantId',
      );

      if (res['ok'] == true) {
        final nuevos = (res['data'] as List)
            .map((p) => p as Map<String, dynamic>)
            .toList();

        // Detectar pedidos nuevos (PENDIENTES que no vimos antes)
        final pendientesNuevos = nuevos
            .where((p) =>
                p['estado'] == 'PENDIENTE' &&
                !_idsVistos.contains(p['id']))
            .toList();

        if (pendientesNuevos.isNotEmpty && !_primeraCarga) {
          await _reproducirSonido();
        }

        // Registrar IDs vistos
        for (final p in nuevos) {
          _idsVistos.add(p['id'] as String);
        }

        setState(() {
          _pedidos = nuevos;
          _loading = false;
          _error = null;
          _primeraCarga = false;
        });
      } else {
        if (!silencioso) {
          setState(() {
            _error = res['error'] ?? 'Error al cargar';
            _loading = false;
          });
        }
      }
    } catch (e) {
      if (!silencioso) {
        setState(() {
          _error = 'Error de conexión: $e';
          _loading = false;
        });
      }
    }
  }

  Future<void> _reproducirSonido() async {
    try {
      await _audioPlayer.play(AssetSource('sounds/beep.ogg'));
    } catch (e) {
      debugPrint('Error al reproducir sonido: $e');
    }
  }

  Future<void> _aceptar(Map<String, dynamic> pedido) async {
    final tiempo = await showDialog<int>(
      context: context,
      builder: (ctx) => _TiempoDialog(),
    );

    if (tiempo == null) return;

    try {
      final res = await Api.patch(
        '/api/pedidos/local/${pedido['id']}/aceptar',
        {'tiempo_estimado': tiempo},
      );

      if (res['ok'] == true) {
        _cargarPedidos(silencioso: true);
      } else {
        _mostrarError(res['error'] ?? 'Error al aceptar');
      }
    } catch (e) {
      _mostrarError('Error de conexión');
    }
  }

  Future<void> _rechazar(Map<String, dynamic> pedido) async {
    final motivo = await showDialog<String>(
      context: context,
      builder: (ctx) => _MotivoDialog(),
    );

    if (motivo == null) return;

    try {
      final res = await Api.patch(
        '/api/pedidos/local/${pedido['id']}/rechazar',
        {'motivo': motivo},
      );

      if (res['ok'] == true) {
        _cargarPedidos(silencioso: true);
      } else {
        _mostrarError(res['error'] ?? 'Error al rechazar');
      }
    } catch (e) {
      _mostrarError('Error de conexión');
    }
  }

  Future<void> _marcarListo(Map<String, dynamic> pedido) async {
    try {
      final res = await Api.patch(
        '/api/pedidos/local/${pedido['id']}/listo',
        {},
      );

      if (res['ok'] == true) {
        _cargarPedidos(silencioso: true);
      } else {
        _mostrarError(res['error'] ?? 'Error');
      }
    } catch (e) {
      _mostrarError('Error de conexión');
    }
  }

  void _verDetalle(Map<String, dynamic> pedido) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF151515),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _DetallePedido(pedido: pedido),
    );
  }

  void _mostrarError(String mensaje) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(mensaje),
        backgroundColor: const Color(0xFFEF4444),
      ),
    );
  }

  @override
  void dispose() {
    _timer?.cancel();
    _audioPlayer.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(color: Color(0xFF7ED321)),
      );
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error, color: Colors.red, size: 48),
              const SizedBox(height: 12),
              Text(
                _error!,
                style: const TextStyle(color: Colors.grey),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _cargarPedidos,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF7ED321),
                  foregroundColor: Colors.black,
                ),
                child: const Text('Reintentar'),
              ),
            ],
          ),
        ),
      );
    }

    if (_pedidos.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('🍽️', style: TextStyle(fontSize: 64)),
              SizedBox(height: 16),
              Text(
                'Sin pedidos por ahora',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              SizedBox(height: 8),
              Text(
                'Los pedidos aparecerán aquí',
                style: TextStyle(color: Colors.grey, fontSize: 14),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => _cargarPedidos(),
      color: const Color(0xFF7ED321),
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _pedidos.length,
        itemBuilder: (context, i) {
          final pedido = _pedidos[i];
          return PedidoCard(
            pedido: pedido,
            onAceptar: () => _aceptar(pedido),
            onRechazar: () => _rechazar(pedido),
            onListo: () => _marcarListo(pedido),
            onVerDetalle: () => _verDetalle(pedido),
          );
        },
      ),
    );
  }
}

// ============================================
// DIALOG: Tiempo estimado
// ============================================
class _TiempoDialog extends StatefulWidget {
  @override
  State<_TiempoDialog> createState() => _TiempoDialogState();
}

class _TiempoDialogState extends State<_TiempoDialog> {
  int _minutos = 20;

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: const Color(0xFF151515),
      title: const Text(
        '¿Cuánto tardará?',
        style: TextStyle(color: Colors.white),
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text(
            'Tiempo estimado de preparación',
            style: TextStyle(color: Colors.grey, fontSize: 13),
          ),
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              IconButton(
                onPressed: () {
                  if (_minutos > 5) setState(() => _minutos -= 5);
                },
                icon: const Icon(Icons.remove, color: Colors.white),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFF0A0A0A),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF7ED321)),
                ),
                child: Text(
                  '$_minutos min',
                  style: const TextStyle(
                    color: Color(0xFF7ED321),
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              IconButton(
                onPressed: () {
                  if (_minutos < 120) setState(() => _minutos += 5);
                },
                icon: const Icon(Icons.add, color: Colors.white),
              ),
            ],
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancelar', style: TextStyle(color: Colors.grey)),
        ),
        ElevatedButton(
          onPressed: () => Navigator.pop(context, _minutos),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF7ED321),
            foregroundColor: Colors.black,
          ),
          child: const Text('Aceptar'),
        ),
      ],
    );
  }
}

// ============================================
// DIALOG: Motivo de rechazo
// ============================================
class _MotivoDialog extends StatefulWidget {
  @override
  State<_MotivoDialog> createState() => _MotivoDialogState();
}

class _MotivoDialogState extends State<_MotivoDialog> {
  final _ctrl = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: const Color(0xFF151515),
      title: const Text(
        'Motivo de rechazo',
        style: TextStyle(color: Colors.white),
      ),
      content: TextField(
        controller: _ctrl,
        style: const TextStyle(color: Colors.white),
        maxLines: 3,
        decoration: InputDecoration(
          hintText: 'Ej: Sin stock, cerrado, etc.',
          hintStyle: const TextStyle(color: Colors.grey),
          filled: true,
          fillColor: const Color(0xFF0A0A0A),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancelar', style: TextStyle(color: Colors.grey)),
        ),
        ElevatedButton(
          onPressed: () => Navigator.pop(context, _ctrl.text.trim()),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFFEF4444),
            foregroundColor: Colors.white,
          ),
          child: const Text('Rechazar'),
        ),
      ],
    );
  }
}

// ============================================
// BOTTOM SHEET: Detalle del pedido
// ============================================
class _DetallePedido extends StatelessWidget {
  final Map<String, dynamic> pedido;

  const _DetallePedido({required this.pedido});

  @override
  Widget build(BuildContext context) {
    final items = (pedido['items'] as List?) ?? [];
    final dir = pedido['direccion_snapshot'] as Map<String, dynamic>? ?? {};

    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            pedido['pedido_codigo'] ?? '',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 20),
          const Text(
            'Cliente',
            style: TextStyle(
              color: Colors.grey,
              fontSize: 12,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            pedido['cliente_nombre'] ?? '',
            style: const TextStyle(color: Colors.white, fontSize: 15),
          ),
          Text(
            pedido['cliente_celular'] ?? '',
            style: const TextStyle(color: Colors.grey, fontSize: 13),
          ),
          const SizedBox(height: 16),
          const Text(
            'Dirección',
            style: TextStyle(
              color: Colors.grey,
              fontSize: 12,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            dir['direccion'] ?? '',
            style: const TextStyle(color: Colors.white, fontSize: 14),
          ),
          if (dir['referencia'] != null) ...[
            const SizedBox(height: 4),
            Text(
              'Ref: ${dir['referencia']}',
              style: const TextStyle(color: Colors.grey, fontSize: 12),
            ),
          ],
          const SizedBox(height: 16),
          const Text(
            'Items',
            style: TextStyle(
              color: Colors.grey,
              fontSize: 12,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          ...items.map((item) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  children: [
                    Text(
                      '${item['cantidad']}x ',
                      style: const TextStyle(
                        color: Color(0xFF7ED321),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Expanded(
                      child: Text(
                        item['nombre_snapshot'] ?? '',
                        style: const TextStyle(color: Colors.white),
                      ),
                    ),
                    Text(
                      'S/ ${item['subtotal']}',
                      style: const TextStyle(color: Colors.white),
                    ),
                  ],
                ),
              )),
          const SizedBox(height: 20),
        ],
      ),
    );
  }
}