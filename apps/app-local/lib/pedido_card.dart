import 'package:flutter/material.dart';

class PedidoCard extends StatelessWidget {
  final Map<String, dynamic> pedido;
  final VoidCallback onAceptar;
  final VoidCallback onRechazar;
  final VoidCallback onListo;
  final VoidCallback onVerDetalle;

  const PedidoCard({
    super.key,
    required this.pedido,
    required this.onAceptar,
    required this.onRechazar,
    required this.onListo,
    required this.onVerDetalle,
  });

  String get _estadoLabel {
    switch (pedido['estado']) {
      case 'PENDIENTE':
        return 'Pendiente';
      case 'ACEPTADO':
        return 'Aceptado';
      case 'PREPARANDO':
        return 'Preparando';
      case 'LISTO':
        return 'Listo';
      default:
        return pedido['estado'] ?? '';
    }
  }

  Color get _estadoColor {
    switch (pedido['estado']) {
      case 'PENDIENTE':
        return const Color(0xFFFFC107);
      case 'ACEPTADO':
        return const Color(0xFF2196F3);
      case 'PREPARANDO':
        return const Color(0xFF9C27B0);
      case 'LISTO':
        return const Color(0xFF7ED321);
      default:
        return Colors.grey;
    }
  }

  String _tiempoRelativo(String fecha) {
    final creado = DateTime.parse(fecha);
    final diff = DateTime.now().difference(creado);
    if (diff.inMinutes < 1) return 'Ahora mismo';
    if (diff.inMinutes < 60) return 'Hace ${diff.inMinutes} min';
    return 'Hace ${diff.inHours}h';
  }

  @override
  Widget build(BuildContext context) {
    final items = (pedido['items'] as List?) ?? [];
    final dir = pedido['direccion_snapshot'] as Map<String, dynamic>? ?? {};
    final total = double.tryParse(pedido['pedido_total']?.toString() ?? '0') ?? 0;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF151515),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF222222)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // HEADER
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      pedido['pedido_codigo'] ?? '',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _tiempoRelativo(pedido['creado_en'] ?? ''),
                      style: const TextStyle(
                        color: Colors.grey,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: _estadoColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  _estadoLabel,
                  style: TextStyle(
                    color: _estadoColor,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // CLIENTE
          Row(
            children: [
              const Icon(Icons.person, size: 16, color: Colors.grey),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  pedido['cliente_nombre'] ?? 'Sin nombre',
                  style: const TextStyle(color: Colors.white, fontSize: 13),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),

          // DIRECCION
          Row(
            children: [
              const Icon(Icons.location_on, size: 16, color: Colors.grey),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  dir['direccion'] ?? 'Sin dirección',
                  style: const TextStyle(color: Colors.grey, fontSize: 12),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // ITEMS + TOTAL
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${items.length} item${items.length == 1 ? '' : 's'}',
                style: const TextStyle(color: Colors.grey, fontSize: 12),
              ),
              Text(
                'S/ ${total.toStringAsFixed(2)}',
                style: const TextStyle(
                  color: Color(0xFF7ED321),
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
            ],
          ),

          // NOTAS
          if (pedido['notas'] != null &&
              (pedido['notas'] as String).isNotEmpty) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFFFFC107).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.note,
                    size: 14,
                    color: Color(0xFFFFC107),
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      pedido['notas'],
                      style: const TextStyle(
                        color: Color(0xFFFFC107),
                        fontSize: 11,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 12),

          // ACCIONES
          if (pedido['estado'] == 'PENDIENTE')
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: onVerDetalle,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.grey,
                      side: const BorderSide(color: Color(0xFF222222)),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: const Text('Ver'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: onRechazar,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFFEF4444),
                      side: const BorderSide(color: Color(0xFFEF4444)),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: const Text('Rechazar'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  flex: 2,
                  child: ElevatedButton(
                    onPressed: onAceptar,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF7ED321),
                      foregroundColor: Colors.black,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: const Text(
                      'Aceptar',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            )
          else if (pedido['estado'] == 'ACEPTADO' ||
              pedido['estado'] == 'PREPARANDO')
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: onVerDetalle,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.grey,
                      side: const BorderSide(color: Color(0xFF222222)),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: const Text('Ver detalle'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  flex: 2,
                  child: ElevatedButton(
                    onPressed: onListo,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF7ED321),
                      foregroundColor: Colors.black,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: const Text(
                      'Marcar como listo',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            )
          else if (pedido['estado'] == 'LISTO')
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 12),
              decoration: BoxDecoration(
                color: const Color(0xFF7ED321).withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: const Color(0xFF7ED321).withValues(alpha: 0.3),
                ),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.check_circle,
                    color: Color(0xFF7ED321),
                    size: 18,
                  ),
                  SizedBox(width: 8),
                  Text(
                    'Esperando repartidor',
                    style: TextStyle(
                      color: Color(0xFF7ED321),
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}