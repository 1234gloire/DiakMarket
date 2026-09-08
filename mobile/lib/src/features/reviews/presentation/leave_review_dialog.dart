import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../models/review.dart';
import '../data/reviews_repository.dart';

class LeaveReviewDialog extends ConsumerStatefulWidget {
  final String orderId;
  final String targetId;
  final String targetName;

  const LeaveReviewDialog({super.key, required this.orderId, required this.targetId, required this.targetName});

  @override
  ConsumerState<LeaveReviewDialog> createState() => _LeaveReviewDialogState();
}

class _LeaveReviewDialogState extends ConsumerState<LeaveReviewDialog> {
  int _rating = 5;
  final _commentController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _isSubmitting = true);
    try {
      await ref.read(reviewsRepositoryProvider).create(
            orderId: widget.orderId,
            type: ReviewType.BUYER_TO_SELLER,
            targetId: widget.targetId,
            rating: _rating,
            comment: _commentController.text.trim(),
          );
      if (mounted) Navigator.of(context).pop(true);
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text('Noter ${widget.targetName}'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(5, (index) {
              final starValue = index + 1;
              return IconButton(
                icon: Icon(starValue <= _rating ? Icons.star : Icons.star_border, color: Colors.amber),
                onPressed: () => setState(() => _rating = starValue),
              );
            }),
          ),
          TextField(
            controller: _commentController,
            decoration: const InputDecoration(labelText: 'Commentaire (optionnel)'),
            maxLines: 3,
          ),
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Annuler')),
        FilledButton(
          onPressed: _isSubmitting ? null : _submit,
          child: _isSubmitting ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Envoyer'),
        ),
      ],
    );
  }
}
