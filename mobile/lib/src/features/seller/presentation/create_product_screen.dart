import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/network/cloudinary_upload_service.dart';
import '../../../models/product.dart';
import '../../profile/providers/current_user_provider.dart';
import '../../reference/data/reference_repository.dart';
import '../data/seller_products_repository.dart';
import '../providers/seller_products_provider.dart';

class CreateProductScreen extends ConsumerStatefulWidget {
  const CreateProductScreen({super.key});

  @override
  ConsumerState<CreateProductScreen> createState() => _CreateProductScreenState();
}

class _CreateProductScreenState extends ConsumerState<CreateProductScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _priceController = TextEditingController();
  final _brandController = TextEditingController();

  String? _categoryId;
  String? _cityId;
  ProductCondition _condition = ProductCondition.GOOD;
  final List<File> _images = [];
  bool _isSubmitting = false;
  String? _errorMessage;

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _priceController.dispose();
    _brandController.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    if (_images.length >= 5) return;
    final picked = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (picked != null) setState(() => _images.add(File(picked.path)));
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_images.isEmpty) {
      setState(() => _errorMessage = 'Ajoutez au moins une photo');
      return;
    }

    final countryId = ref.read(currentUserProvider).value?.countryId;
    if (countryId == null || _categoryId == null) {
      setState(() => _errorMessage = 'Choisissez une catégorie');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      final repo = ref.read(sellerProductsRepositoryProvider);
      final product = await repo.create(CreateProductInput(
        categoryId: _categoryId!,
        countryId: countryId,
        cityId: _cityId,
        title: _titleController.text.trim(),
        description: _descriptionController.text.trim(),
        price: int.parse(_priceController.text.trim()),
        condition: _condition,
        brand: _brandController.text.trim(),
      ));

      final uploader = ref.read(cloudinaryUploadServiceProvider);
      for (var i = 0; i < _images.length; i++) {
        final uploaded = await uploader.uploadProductImage(_images[i]);
        await repo.addImage(
          product.id,
          url: uploaded.url,
          publicId: uploaded.publicId,
          width: uploaded.width,
          height: uploaded.height,
          bytes: uploaded.bytes,
          isPrimary: i == 0,
        );
      }

      await repo.publish(product.id);
      await ref.read(myListingsProvider.notifier).refresh();

      if (mounted) context.pop(true);
    } catch (e) {
      setState(() => _errorMessage = e is ApiException ? e.message : "Impossible de publier l'annonce");
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final categoriesAsync = ref.watch(categoriesProvider);
    final countryId = ref.watch(currentUserProvider).value?.countryId;
    final citiesAsync = countryId != null ? ref.watch(citiesProvider(countryId)) : null;

    return Scaffold(
      appBar: AppBar(title: const Text('Publier une annonce')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text('Photos (jusqu\'à 5)', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            SizedBox(
              height: 90,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  ..._images.asMap().entries.map(
                        (entry) => Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: Stack(
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: Image.file(entry.value, width: 90, height: 90, fit: BoxFit.cover),
                              ),
                              Positioned(
                                top: 0,
                                right: 0,
                                child: GestureDetector(
                                  onTap: () => setState(() => _images.removeAt(entry.key)),
                                  child: const CircleAvatar(
                                    radius: 12,
                                    backgroundColor: Colors.black54,
                                    child: Icon(Icons.close, size: 14, color: Colors.white),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                  if (_images.length < 5)
                    InkWell(
                      onTap: _pickImage,
                      child: Container(
                        width: 90,
                        height: 90,
                        decoration: BoxDecoration(
                          border: Border.all(color: Theme.of(context).colorScheme.outline),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.add_a_photo_outlined),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            TextFormField(
              controller: _titleController,
              decoration: const InputDecoration(labelText: 'Titre'),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Titre requis' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _descriptionController,
              decoration: const InputDecoration(labelText: 'Description'),
              maxLines: 4,
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Description requise' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _priceController,
              decoration: const InputDecoration(labelText: 'Prix (FCFA)'),
              keyboardType: TextInputType.number,
              validator: (v) {
                final n = int.tryParse(v ?? '');
                return (n == null || n <= 0) ? 'Prix invalide' : null;
              },
            ),
            const SizedBox(height: 12),
            categoriesAsync.when(
              data: (categories) => DropdownButtonFormField<String>(
                initialValue: _categoryId,
                decoration: const InputDecoration(labelText: 'Catégorie'),
                items: categories.map((c) => DropdownMenuItem(value: c.id, child: Text(c.name))).toList(),
                onChanged: (v) => setState(() => _categoryId = v),
                validator: (v) => v == null ? 'Choisissez une catégorie' : null,
              ),
              loading: () => const LinearProgressIndicator(),
              error: (_, __) => const SizedBox.shrink(),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<ProductCondition>(
              initialValue: _condition,
              decoration: const InputDecoration(labelText: 'État'),
              items: ProductCondition.values.map((c) => DropdownMenuItem(value: c, child: Text(c.label))).toList(),
              onChanged: (v) => setState(() => _condition = v!),
            ),
            const SizedBox(height: 12),
            if (citiesAsync != null)
              citiesAsync.when(
                data: (cities) => DropdownButtonFormField<String>(
                  initialValue: _cityId,
                  decoration: const InputDecoration(labelText: 'Ville (optionnel)'),
                  items: cities.map((c) => DropdownMenuItem(value: c.id, child: Text(c.name))).toList(),
                  onChanged: (v) => setState(() => _cityId = v),
                ),
                loading: () => const LinearProgressIndicator(),
                error: (_, __) => const SizedBox.shrink(),
              ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _brandController,
              decoration: const InputDecoration(labelText: 'Marque (optionnel)'),
            ),
            if (_errorMessage != null) ...[
              const SizedBox(height: 16),
              Text(_errorMessage!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ],
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _isSubmitting ? null : _submit,
              child: _isSubmitting
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Publier'),
            ),
          ],
        ),
      ),
    );
  }
}
