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
  String _filtro = 'TODOS';
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

    // Contadores por estado
    final total = _pedidos.length;
    final pendientes =
        _pedidos.where((p) => p['estado'] == 'PENDIENTE').length;
    final enProceso = _pedidos
        .where((p) => p['estado'] == 'ACEPTADO' || p['estado'] == 'PREPARANDO')
        .length;
    final listos = _pedidos.where((p) => p['estado'] == 'LISTO').length;

    // Filtrar según el tab activo
    final filtrados = _pedidos.where((p) {
      if (_filtro == 'TODOS') return true;
      if (_filtro == 'PENDIENTE') return p['estado'] == 'PENDIENTE';
      if (_filtro == 'EN_PROCESO') {
        return p['estado'] == 'ACEPTADO' || p['estado'] == 'PREPARANDO';
      }
      if (_filtro == 'LISTO') return p['estado'] == 'LISTO';
      return true;
    }).toList();

    return Column(
      children: [
        // TABS DE FILTRO
        Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildTab('TODOS', 'Todos', total, const Color(0xFF7ED321)),
                const SizedBox(width: 8),
                _buildTab(
                  'PENDIENTE',
                  'Pendientes',
                  pendientes,
                  const Color(0xFFFFC107),
                ),
                const SizedBox(width: 8),
                _buildTab(
                  'EN_PROCESO',
                  'En proceso',
                  enProceso,
                  const Color(0xFF2196F3),
                ),
                const SizedBox(width: 8),
                _buildTab(
                  'LISTO',
                  'Listos',
                  listos,
                  const Color(0xFF7ED321),
                ),
              ],
            ),
          ),
        ),

        // LISTA O VACÍO
        Expanded(
          child: filtrados.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          _filtro == 'PENDIENTE' ? '✅' : '🍽️',
                          style: const TextStyle(fontSize: 64),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          _filtro == 'PENDIENTE'
                              ? 'Sin pedidos pendientes'
                              : 'Sin pedidos en esta categoría',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Los pedidos aparecerán aquí',
                          style: TextStyle(color: Colors.grey, fontSize: 14),
                        ),
                      ],
                    ),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: () => _cargarPedidos(),
                  color: const Color(0xFF7ED321),
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: filtrados.length,
                    itemBuilder: (context, i) {
                      final pedido = filtrados[i];
                      return PedidoCard(
                        pedido: pedido,
                        onAceptar: () => _aceptar(pedido),
                        onRechazar: () => _rechazar(pedido),
                        onListo: () => _marcarListo(pedido),
                        onVerDetalle: () => _verDetalle(pedido),
                      );
                    },
                  ),
                ),
        ),
      ],
    );
  }

  // ============================================
  // TAB DE FILTRO
  // ============================================
  Widget _buildTab(String key, String label, int count, Color color) {
    final activo = _filtro == key;
    return GestureDetector(
      onTap: () => setState(() => _filtro = key),
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: 14,
          vertical: 8,
        ),
        decoration: BoxDecoration(
          color: activo
              ? color.withValues(alpha: 0.15)
              : const Color(0xFF151515),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: activo ? color : const Color(0xFF222222),
            width: activo ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Text(
              label,
              style: TextStyle(
                color: activo ? color : Colors.grey,
                fontSize: 13,
                fontWeight: activo ? FontWeight.bold : FontWeight.normal,
              ),
            ),
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: 7,
                vertical: 2,
              ),
              decoration: BoxDecoration(
                color: activo
                    ? color.withValues(alpha: 0.3)
                    : const Color(0xFF222222),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                '$count',
                style: TextStyle(
                  color: activo ? color : Colors.grey,
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
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

    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      minChildSize: 0.4,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: Color(0xFF151515),
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: ListView(
            controller: scrollController,
            padding: const EdgeInsets.all(20),
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

              // TOTAL DE PRODUCTOS
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFF7ED321).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: const Color(0xFF7ED321).withValues(alpha: 0.3),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Total de productos',
                      style: TextStyle(
                        color: Color(0xFF7ED321),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      'S/ ${(double.tryParse(pedido['subtotal']?.toString() ?? '0') ?? 0).toStringAsFixed(2)}',
                      style: const TextStyle(
                        color: Color(0xFF7ED321),
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                  ],
                ),
              ),
              if (pedido['notas'] != null &&
                  (pedido['notas'] as String).isNotEmpty) ...[
                const SizedBox(height: 16),
                const Text(
                  'Notas',
                  style: TextStyle(
                    color: Colors.grey,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  pedido['notas'],
                  style: const TextStyle(
                    color: Color(0xFFFFC107),
                    fontSize: 13,
                  ),
                ),
              ],
              const SizedBox(height: 20),
            ],
          ),
        );
      },
    );
  }
}