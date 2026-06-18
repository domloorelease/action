/**
 * Copyright 2026 SoTeen Studio
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import * as fs from 'fs';
 
export const CATEGORIES = ['FEATURES', 'BUG_FIXES', 'MAINTENANCE'] as const;
type Category = (typeof CATEGORIES)[number];

export class CommitClassifier {
  private vocabulary: string[] = [];
  private weightsInputHidden: number[][] = []; 
  private weightsHiddenOutput: number[][] = []; 
  private biasHidden: number[] = [];
  private biasOutput: number[] = [];

  private hiddenSize = 8;
  private learningRate = 0.05; // Diturunkan sedikit agar konvergensi Softmax lebih stabil
  private confidenceThreshold = 0.55; // Batas minimal keyakinan bot

  constructor() {}
  
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 1);
  }

  private buildVocabulary(dataset: string[]): void {
    const vocabSet = new Set<string>();
    dataset.forEach((text) => {
      this.tokenize(text).forEach((word) => vocabSet.add(word));
    });
    this.vocabulary = Array.from(vocabSet);
  }

  private textToVector(text: string): number[] {
    const vector = new Array(this.vocabulary.length).fill(0);
    const tokens = this.tokenize(text);
    tokens.forEach((word) => {
      const idx = this.vocabulary.indexOf(word);
      if (idx !== -1) vector[idx] += 1; 
    });
    return vector;
  }
  
  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  private sigmoidDerivative(x: number): number {
    return x * (1 - x);
  }

  // Jaminan total output = 1.0 menggunakan Softmax
  private softmax(logits: number[]): number[] {
    const maxLogit = Math.max(...logits); // Trik pencegahan numerical overflow (NaN)
    const exps = logits.map((val) => Math.exp(val - maxLogit));
    const sumExps = exps.reduce((a, b) => a + b, 0);
    return exps.map((val) => val / (sumExps || 1));
  }
  
  private initWeights(inputSize: number, outputSize: number): void {
    // Xavier/Glorot Initialization tipis-tipis biar inisialisasi bobot lebih optimal
    this.weightsInputHidden = Array.from({ length: inputSize }, () =>
      Array.from({ length: this.hiddenSize }, () => (Math.random() - 0.5) * Math.sqrt(2 / inputSize)),
    );
    this.weightsHiddenOutput = Array.from({ length: this.hiddenSize }, () =>
      Array.from({ length: outputSize }, () => (Math.random() - 0.5) * Math.sqrt(2 / this.hiddenSize)),
    );
    this.biasHidden = new Array(this.hiddenSize).fill(0);
    this.biasOutput = new Array(outputSize).fill(0);
  }
  
  public train(data: { text: string; category: Category }[], epochs = 200): void {
    const texts = data.map((d) => d.text);
    this.buildVocabulary(texts);

    const inputSize = this.vocabulary.length;
    const outputSize = CATEGORIES.length;
    this.initWeights(inputSize, outputSize);

    console.log(`🧠 Training NN dengan ${inputSize} fitur kata unik (Softmax Engine)...`);

    for (let epoch = 0; epoch < epochs; epoch++) {
      for (const item of data) {
        const inputVector = this.textToVector(item.text);
        
        const target = new Array(outputSize).fill(0);
        target[CATEGORIES.indexOf(item.category)] = 1;
        
        // 1. Forward Pass: Input -> Hidden
        const hiddenOutputs = new Array(this.hiddenSize).fill(0);
        for (let j = 0; j < this.hiddenSize; j++) {
          let sum = this.biasHidden[j];
          for (let i = 0; i < inputSize; i++) {
            sum += inputVector[i] * this.weightsInputHidden[i][j];
          }
          hiddenOutputs[j] = this.sigmoid(sum);
        }
        
        // 2. Forward Pass: Hidden -> Output Logits
        const logits = new Array(outputSize).fill(0);
        for (let k = 0; k < outputSize; k++) {
          let sum = this.biasOutput[k];
          for (let j = 0; j < this.hiddenSize; j++) {
            sum += hiddenOutputs[j] * this.weightsHiddenOutput[j][k];
          }
          logits[k] = sum;
        }
        
        // Transformasikan ke Softmax Probabilities
        const finalOutputs = this.softmax(logits);
        
        // 3. Backpropagation dengan Softmax + Cross-Entropy Loss
        // Turunan error-nya jauh lebih simpel & elegan: (Output - Target)
        const outputErrors = new Array(outputSize).fill(0);
        for (let k = 0; k < outputSize; k++) {
          outputErrors[k] = target[k] - finalOutputs[k];
        }
        
        const hiddenErrors = new Array(this.hiddenSize).fill(0);
        for (let j = 0; j < this.hiddenSize; j++) {
          let error = 0;
          for (let k = 0; k < outputSize; k++) {
            error += outputErrors[k] * this.weightsHiddenOutput[j][k];
          }
          hiddenErrors[j] = error * this.sigmoidDerivative(hiddenOutputs[j]);
        }
        
        // 4. Update Weights & Biases
        for (let k = 0; k < outputSize; k++) {
          for (let j = 0; j < this.hiddenSize; j++) {
            this.weightsHiddenOutput[j][k] += this.learningRate * outputErrors[k] * hiddenOutputs[j];
          }
          this.biasOutput[k] += this.learningRate * outputErrors[k];
        }

        for (let j = 0; j < this.hiddenSize; j++) {
          for (let i = 0; i < inputSize; i++) {
            this.weightsInputHidden[i][j] += this.learningRate * hiddenErrors[j] * inputVector[i];
          }
          this.biasHidden[j] += this.learningRate * hiddenErrors[j];
        }
      }
    }
    console.log('✅ Training selesai!');
  }
  
  public classify(text: string): Category {
    if (this.vocabulary.length === 0) return 'MAINTENANCE';

    const inputVector = this.textToVector(text);
    const outputSize = CATEGORIES.length;
    
    const hiddenOutputs = new Array(this.hiddenSize).fill(0);
    for (let j = 0; j < this.hiddenSize; j++) {
      let sum = this.biasHidden[j];
      for (let i = 0; i < this.vocabulary.length; i++) {
        sum += inputVector[i] * this.weightsInputHidden[i][j];
      }
      hiddenOutputs[j] = this.sigmoid(sum);
    }
    
    const logits = new Array(outputSize).fill(0);
    for (let k = 0; k < outputSize; k++) {
      let sum = this.biasOutput[k];
      for (let j = 0; j < this.hiddenSize; j++) {
        sum += hiddenOutputs[j] * this.weightsHiddenOutput[j][k];
      }
      logits[k] = sum;
    }

    const finalOutputs = this.softmax(logits);
    
    let maxIdx = 0;
    let maxVal = -1;
    for (let k = 0; k < outputSize; k++) {
      if (finalOutputs[k] > maxVal) {
        maxVal = finalOutputs[k];
        maxIdx = k;
      }
    }

    // Fitur Canggih: Proteksi kalimat asing / membingungkan
    if (maxVal < this.confidenceThreshold) {
      return 'MAINTENANCE'; 
    }

    return CATEGORIES[maxIdx];
  }

  // Simpan hasil otak pintar ke berkas lokal
  public saveModel(filePath: string): void {
    const modelState = {
      vocabulary: this.vocabulary,
      weightsInputHidden: this.weightsInputHidden,
      weightsHiddenOutput: this.weightsHiddenOutput,
      biasHidden: this.biasHidden,
      biasOutput: this.biasOutput,
    };
    fs.writeFileSync(filePath, JSON.stringify(modelState, null, 2), 'utf8');
  }

  // Muat ulang ingatan otak tanpa ribet training ulang
  public loadModel(filePath: string): boolean {
    if (!fs.existsSync(filePath)) return false;
    try {
      const modelState = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      this.vocabulary = modelState.vocabulary;
      this.weightsInputHidden = modelState.weightsInputHidden;
      this.weightsHiddenOutput = modelState.weightsHiddenOutput;
      this.biasHidden = modelState.biasHidden;
      this.biasOutput = modelState.biasOutput;
      return true;
    } catch {
      return false;
    }
  }
  
  public generateChangelog(commits: string[]): string {
    const groups: Record<Category, string[]> = {
      FEATURES: [],
      BUG_FIXES: [],
      MAINTENANCE: [],
    };

    commits.forEach((commit) => {
      const category = this.classify(commit);
      groups[category].push(commit);
    });

    let markdown = '';
    if (groups.FEATURES.length > 0) markdown += `### 🚀 Features\n${groups.FEATURES.join('\n')}\n\n`;
    if (groups.BUG_FIXES.length > 0) markdown += `### 🐛 Bug Fixes\n${groups.BUG_FIXES.join('\n')}\n\n`;
    if (groups.MAINTENANCE.length > 0) markdown += `### 🧹 Maintenance\n${groups.MAINTENANCE.join('\n')}\n\n`;

    return markdown;
  }
}
