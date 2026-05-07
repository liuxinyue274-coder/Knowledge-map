import torch
from datasets import load_dataset
from transformers import BertTokenizer, BertForSequenceClassification, Trainer, TrainingArguments
from sklearn.metrics import accuracy_score, recall_score, f1_score

# 1. 加载数据集 (以 SST-2 为例)
dataset = load_dataset("glue", "sst2")
tokenizer = BertTokenizer.from_pretrained("bert-base-uncased")

# 2. 数据预处理
def tokenize_function(examples):
    return tokenizer(examples["sentence"], padding="max_length", truncation=True, max_length=128)

tokenized_datasets = dataset.map(tokenize_function, batched=True)

# 3. 定义评估指标函数
def compute_metrics(eval_pred):
    logits, labels = eval_pred
    predictions = torch.argmax(torch.tensor(logits), dim=-1)

    acc = accuracy_score(labels, predictions)
    rec = recall_score(labels, predictions, average='binary')
    f1 = f1_score(labels, predictions, average='binary')

    return {
        'accuracy': acc,
        'recall': rec,
        'f1': f1,
    }

# 4. 加载模型
model = BertForSequenceClassification.from_pretrained("bert-base-uncased", num_labels=2)

# 5. 设置训练参数 (为快速运行，这里设置了较少的 epoch)
training_args = TrainingArguments(
    output_dir="./results",
    evaluation_strategy="epoch",
    per_device_train_batch_size=16,
    num_train_epochs=1,  # 仅运行1轮进行测试
    weight_decay=0.01,
)

# 6. 初始化训练器
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_datasets["train"].shuffle(seed=42).select(range(1000)), # 采样1000条快速测试
    eval_dataset=tokenized_datasets["validation"],
    compute_metrics=compute_metrics,
)

# 7. 开始训练与评估
trainer.train()
eval_results = trainer.evaluate()

print("\n--- 实验最终输出结果 ---")
print(eval_results)
