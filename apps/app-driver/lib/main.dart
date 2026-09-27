import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

const apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://localhost:3100',
);

void main() => runApp(const FoodXpresDriverApp());

class FoodXpresDriverApp extends StatelessWidget {
  const FoodXpresDriverApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'FoodXpres Drivers',
    debugShowCheckedModeBanner: false,
    theme: ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: const Color(0xFF0C0E0B),
      colorScheme: ColorScheme.fromSeed(
        seedColor: const Color(0xFF9BE52D),
        brightness: Brightness.dark,
      ),
      inputDecorationTheme: const InputDecorationTheme(
        filled: true,
        fillColor: Color(0xFF171A16),
        border: OutlineInputBorder(),
      ),
    ),
    home: const DriverLoginPage(),
  );
}

class DriverLoginPage extends StatefulWidget {
  const DriverLoginPage({super.key});

  @override
  State<DriverLoginPage> createState() => _DriverLoginPageState();
}

class _DriverLoginPageState extends State<DriverLoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _cellphone = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  bool _hidePassword = true;
  String? _error;
  Map<String, dynamic>? _signedInUser;
  String? _accessToken;

  @override
  void dispose() {
    _cellphone.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final response = await http
          .post(
            Uri.parse('$apiBaseUrl/api/mobile/auth/login'),
            headers: const {'Content-Type': 'application/json'},
            body: jsonEncode({
              'kind': 'driver',
              'celular': _cellphone.text.trim(),
              'password': _password.text,
            }),
          )
          .timeout(const Duration(seconds: 15));
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      if (response.statusCode != 200 || data['ok'] != true) {
        throw Exception(data['error'] ?? 'No se pudo iniciar sesión.');
      }
      if (!mounted) return;
      setState(() {
        _signedInUser = Map<String, dynamic>.from(data['user'] as Map);
        _accessToken = data['token'] as String;
      });
    } on FormatException {
      setState(() => _error = 'La API devolvió una respuesta inválida.');
    } on Exception catch (error) {
      setState(() => _error = error.toString().replaceFirst('Exception: ', ''));
    } catch (_) {
      setState(
        () => _error =
            'No se pudo conectar con la API. Revisa que esté encendida.',
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_signedInUser != null && _accessToken != null) {
      final user = _signedInUser!;
      return Scaffold(
        body: Center(
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.check_circle,
                    color: Color(0xFF9BE52D),
                    size: 56,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Sesión iniciada',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 8),
                  Text(user['name'] as String),
                  const SizedBox(height: 20),
                  OutlinedButton(
                    onPressed: () => setState(() {
                      _signedInUser = null;
                      _accessToken = null;
                      _password.clear();
                    }),
                    child: const Text('Cerrar sesión'),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 430),
            child: Card(
              color: const Color(0xFF141713),
              child: Padding(
                padding: const EdgeInsets.all(28),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Icon(
                        Icons.delivery_dining,
                        size: 48,
                        color: Color(0xFF9BE52D),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'FOODXPRES · DRIVERS',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.labelLarge?.copyWith(
                          color: const Color(0xFF9BE52D),
                          letterSpacing: 1.2,
                        ),
                      ),
                      const SizedBox(height: 28),
                      Text(
                        'Ingresa a tu cuenta',
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Usa el celular registrado para tu cuenta de driver.',
                      ),
                      const SizedBox(height: 24),
                      TextFormField(
                        controller: _cellphone,
                        keyboardType: TextInputType.phone,
                        autofillHints: const [AutofillHints.telephoneNumber],
                        maxLength: 9,
                        decoration: const InputDecoration(
                          labelText: 'Celular',
                          prefixIcon: Icon(Icons.phone_outlined),
                          counterText: '',
                        ),
                        validator: (value) =>
                            value == null ||
                                !RegExp(r'^9\d{8}$').hasMatch(value.trim())
                            ? 'Ingresa un celular de 9 dígitos que empiece con 9'
                            : null,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _password,
                        obscureText: _hidePassword,
                        autofillHints: const [AutofillHints.password],
                        decoration: InputDecoration(
                          labelText: 'Contraseña',
                          prefixIcon: const Icon(Icons.lock_outline),
                          suffixIcon: IconButton(
                            onPressed: () =>
                                setState(() => _hidePassword = !_hidePassword),
                            icon: Icon(
                              _hidePassword
                                  ? Icons.visibility
                                  : Icons.visibility_off,
                            ),
                          ),
                        ),
                        validator: (value) => value == null || value.isEmpty
                            ? 'Ingresa tu contraseña'
                            : null,
                        onFieldSubmitted: (_) {
                          if (!_busy) _login();
                        },
                      ),
                      if (_error != null) ...[
                        const SizedBox(height: 16),
                        Text(
                          _error!,
                          style: const TextStyle(color: Colors.redAccent),
                        ),
                      ],
                      const SizedBox(height: 24),
                      FilledButton(
                        onPressed: _busy ? null : _login,
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          child: _busy
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Text('Iniciar sesión'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
