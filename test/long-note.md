
# 1. Regression and Classification

@def Machine Learning {
    A computer program is said to learn from experience $E$ with respect to some class of tasks $T$ and performance measure $P$, if its performance at tasks in $T$, as measured by $P$, improves with experience $E$.
}

Taxonomy of Machine Learning:

- Supervised Learning: labeled data
    - Regression: predicting continuous values
    - Classification: predicting discrete labels
- Unsupervised Learning: unlabeled data
    - Clustering: grouping similar data points
- Reinforcement Learning: learning via rewards and punishments

## Linear Regression

We have a dataset $\{\bold x_i, y_i\}_{i=1}^N$, where $\bold x_i \in \mathbb{R}^d$ are the input features and $y_i \in \mathbb{R}$ are the target values. 

The model is defined as:

$$ f_{\bold w, b} = \bold w^T \bold x + b $$

where $\bold w \in \mathbb{R}^d$ are the weights and $b \in \mathbb{R}$ is the bias term.

The goal is to minimize the $l_2$ loss (Mean Squared Error):

$$ \text{Loss}(\bold w, b) = \dfrac{1}{N} \sum_{i=1}^N (f_{\bold w, b}(\bold x_i) - y_i)^2 $$

---

Define $\bar w = [b; \bold w]^T$ and $\bar{\bold x}_i = [1; \bold x_i]^T$, then the model can be rewritten as:

$$ f_{\bar w}(\bar{\bold x}) = \bar w^T \bar{\bold x} $$

$$ \text{Loss}(\bar w) = \dfrac{1}{N} \sum_{i=1}^N (\bar w^T \bar{\bold x}_i - y_i)^2 = \dfrac{1}{N} \|\bold X \bar w - \bold y\|_2^2 $$

$$
\begin{aligned}
N J(\bar w) &= ( X \bar w - \bold y)^T (X \bar w - \bold y) \\
&= \bar w^T X^T X \bar w - 2 \bold y^T X \bar w + \bold y^T \bold y \\
\end{aligned}
$$

$$ N \nabla_{\bar w} J(\bar w) =2 (X^T X \bar w - X^T \bold y) $$

By setting the gradient to zero, we get the closed-form solution:

@remember {
    The closed-form solution to linear regression is given by:
    
    $$ \bar w^* = (X^T X)^{-1} X^T \bold y $$
}

### Learning vector-based linear functions

Suppose we want to predict $h$ outputs parallely. The model is defined as:

$$ Y = X \bar W $$

![alt text](image.png)

$$ \text{Loss}(\bar W) = \dfrac{1}{N} \sum\limits_{k=1}^h (X \bar w_k - \bold y^{(k)})^T (X \bar w_k - \bold y^{(k)}) $$

where $\bar w_k$ is the $k$-th column of $\bar W$ and $\bold y^{(k)}$ is the $k$-th column of $Y$.

The closed-form solution is:

@remember {
    The closed-form solution for vector-based linear regression is given by:
        
    $$ \bar W^* = (X^T X)^{-1} X^T Y \in \mathbb{R}^{(d+1) \times h} $$
}

### MLE and Linear Regression

Assume the data is generated as:

$$ y_i = \bold w^T \bold x_i + b + \epsilon_i, \quad \epsilon_i \sim \mathcal{N}(0, \sigma^2) $$

The pdf of $y_i$ given $\bold x_i$ is:

$$ p(y_i | \bold x_i; \bar w, \sigma^2) = \dfrac{1}{\sqrt{2 \pi \sigma^2}} \exp\left( -\dfrac{(y_i - \bar w^T \bar x_i)^2}{2 \sigma^2} \right) $$

Let our assumption on $\bar w$ and $\sigma^2$ be uniform: $P(\bar w, \sigma^2) \propto 1$, which means we have no prior knowledge about $\bar w$ and $\sigma^2$.

The likelihood of the dataset is:

$$ L(\bar w, \sigma^2) = \prod_{i=1}^N \dfrac{1}{\sqrt{2 \pi \sigma^2}} \exp\left( -\dfrac{(y_i - \bar w^T \bar x_i)^2}{2 \sigma^2} \right) $$

$$ \log L(\bar w, \sigma^2) = -\dfrac{N}{2} \log(2 \pi \sigma^2) - \dfrac{1}{2 \sigma^2} \sum_{i=1}^N (y_i - \bar w^T \bar x_i)^2 $$

Maximizing the log-likelihood is equivalent to minimizing the sum of squared errors, which leads to the same solution as linear regression.

@remember {
    The MLE solution for linear regression is given by:

    $$\bar w^* = (\bold X^T \bold X)^{-1} \bold X^T \bold y $$

    $$\bar \sigma^{2*} = \dfrac{1}{N} \sum_{i=1}^N (y_i - \bar w^{*T} \bar x_i)^2 = \dfrac{1}{N} \|\bold X \bar w^* - \bold y\|^2 $$
}

## Linear Classification

For binary classification, we have labels $y_i \in \{-1, 1\}$. The model is defined as:

$$ \hat y = \text{sign}(\bold w^T \bold x + b) $$

However, this model may not be extensible to multi-class classification, as the classes may be independent from each other and not ordered.

To handle multi-class classification, we can use one-hot encoding for the labels. For $C$ classes, the label vector $\bold y_i \in \{0, 1\}^K$ has a 1 in the position corresponding to the class and 0s elsewhere.

The model is defined as:

$$ \hat y = \text{argmax}_{k} (\bold w_k^T \bold x + b_k) $$

where $\bold w_k$ and $b_k$ are the weights and bias for class $k$.

For the dataset consisting of $N$ samples, we concatenate the $y_i$ into a matrix $Y \in \{0, 1\}^{N \times C}$, and

$$ \bar W^* = (X^T X)^{-1} X^T Y \in \mathbb{R}^{(d+1) \times N \times C} $$

## Polynomial Regression

To model non-linear relationships, we can use polynomial regression.

For quadratic regression (order-2), the general form is:

$$ f_w(\bold x) = w_0 + \sum_{i=1}^d w_i x_i + \sum_{i=1}^d \sum_{j=i}^d w_{ij} x_i x_j $$

For $d$-variable, order-$p$ polynomial, the number of terms is:

$$ \sum_{k=0}^p \binom{d+k-1}{k} = \binom{d+p}{p} $$

Build the polynomial feature matrix $P$, where each column corresponds to a polynomial term. The model can be rewritten as:

$$ f_w(\bold x) = w^T P(\bold x) $$

Note that the bias term $w_0 = b$ is included in the polynomial features as the constant term.

## Ridge Regression

When the number of features $d$ is large, the matrix $X^T X$ may be singular, making it impossible to compute the inverse. There are too many parameters available for the model to adjust, which makes it unstable and prone to overfitting.

To address this issue, we can add a regularization term to the loss function:

$$ \text{Loss}(\bar w) = \sum\limits_{i=1}^N (f_{\bold w,b}(\bold x_i) - y_i)^2 + \lambda \|\bar w\|^2 = \|\bold X \bar w - \bold y\|^2 + \lambda \|\bar w\|^2 $$

The extra term encourages the weights to be small (known as shrinkage).

The optimal solution can be derived as:

$$ \bar w^* = \arg\min_{\bar w} \|\bold X \bar w - \bold y\|^2 + \lambda \|\bar w\|^2 $$

$$
\begin{aligned}
(X \bar w - \bold y)^T (X \bar w - \bold y) + \lambda \bar w^T \bar w
&= \bar w^T X^T X \bar w - 2 \bold y^T X \bar w + \bold y^T \bold y + \lambda \bar w^T \bar w \\
&= \bar w^T (X^T X + \lambda I) \bar w - 2 \bold y^T X \bar w + \bold y^T \bold y \\
\end{aligned}
$$

$$ \nabla_{\bar w} J(\bar w) = 2 (X^T X + \lambda I) \bar w - 2 X^T \bold y $$

$$ \bar w^* = (X^T X + \lambda I)^{-1} X^T \bold y $$

---

@[Invertibility of $X^T X + \lambda I$]

Is the problem of invertiblility solved? 

@thm The matrix $X^T X + \lambda I$ is always invertible for $\lambda > 0$.

@lemma $X^T X + \lambda I$ is positive definite for $\lambda > 0$.

@proof {
    For any non-zero vector $\bold z \in \mathbb{R}^{d+1}$, we have:
    
    $$ \bold z^T (X^T X + \lambda I) \bold z = \bold z^T (X^T X) \bold z + \lambda \bold z^T \bold z = \|X \bold z\|^2 + \lambda \|\bold z\|^2 > 0 $$
}

@lemma A positive definite matrix is invertible.

@proof {
    Assume $A$ is a positive definite matrix but not invertible. Then there exists a non-zero vector $\bold z$ such that $A \bold z = 0$. 
    
    $$\Rightarrow \bold z^T A \bold z = \bold z^T 0 = 0 $$
    
    This contradicts the positive definiteness of $A$. Therefore, $A$ must be invertible.
}

From the above lemmas, we conclude that $X^T X + \lambda I$ is invertible for $\lambda > 0$.

### Dual Formulation

When $d>m$, the computational cost of inverting a $(d+1) \times (d+1)$ matrix is high.

To reduce the computational cost, we can derive the dual formulation of ridge regression:

$$ (X^T X + \lambda I_{d+1})^{-1} X^T \bold y = X^T (X X^T + \lambda I_m)^{-1} \bold y $$

@proof {
    @lemma Woodbury Formula {
        $$ (I+UV)^{-1} = I - U(I+VU)^{-1}V $$
    }
    
    For $X \in \mathbb{R}^{m \times (d+1)}$, 
    
    $$
    \begin{aligned}
    \quad & X^T (X X^T + \lambda I_m)^{-1} \\
    &= \lambda^{-1} X^T (I_m + \lambda^{-1} X X^T)^{-1} \\
    &= \lambda^{-1} X^T (I_m - \lambda^{-1} X (I_{d+1} + \lambda^{-1} X^T X)^{-1} X^T) \\
    &= \lambda^{-1} [X^T - X^T X (X^T X + \lambda I_{d+1})^{-1} X^T] \\
    &= \lambda^{-1} [I_{d+1} - X^T X (X^T X + \lambda I_{d+1})^{-1}] X^T \\
    &= \lambda^{-1} [(X^T X + \lambda I_{d+1}) (X^T X + \lambda I_{d+1})^{-1} - X^T X (X^T X + \lambda I_{d+1})^{-1}] X^T \\
    &= (X^T X + \lambda I_{d+1})^{-1} X^T
    \end{aligned}
    $$
}

The optimal solution in dual form:

@remember Dual Formulation of Ridge Regression {
     The optimal solution in dual form is given by:
    $$ \bar w^* = X^T (X X^T + \lambda I_m)^{-1} \bold y $$
}

## Gradient Descent

For more complex and non-linear models, we may not have a closed-form solution. In such cases, we can use iterative optimization algorithms like gradient descent to find the optimal parameters.

The update rule for gradient descent is:

$$ \bold w_{k+1} \leftarrow \bold w_k - \eta \nabla_{\bold w} C(\bold w_k) $$

where $\eta$ is the learning rate and $C(\bold w)$ is the cost function we want to minimize.

Gradient descent can only guarantee convergence to a local minimum, which may not be the global minimum. However, for convex cost functions, the only local minimum is the global minimum, so gradient descent will converge to the optimal solution.

### Variation: Changing Learning Rate

1. Decreasing learning rate: $\eta_{k+1} = \eta_k / \alpha$ or $\eta_{k+1} = \eta_k - \alpha$ for some $\alpha > 0$.

Update rule:

$$ \bold w_{k+1} \leftarrow \bold w_k - \eta_k \nabla_{\bold w} C(\bold w_k) $$

2. Adagrad (Adaptive Gradient Algorithm):

$$ \bold w_{k+1} \leftarrow \bold w_k - \eta (M_k + \epsilon I)^{-1/2} \nabla_{\bold w} C(\bold w_k) $$

where $M_k = \sum_{i=1}^k \nabla_{\bold w} C(\bold w_i) \nabla_{\bold w} C(\bold w_i)^T$ is the accumulated gradient matrix and $\epsilon$ is a small constant to prevent division by zero.

Or in element-wise form:

$$ [\bold w_{k+1}]_i \leftarrow [\bold w_k]_i - \dfrac{\eta}{\sqrt{[M_k]_{ii} + \epsilon}} [\nabla_{\bold w} C(\bold w_k)]_i $$

### Variation: Different Gradient Estimation

1. Momentum-based gradient descent:

$$ \bold v_k = \beta \bold v_{k-1} + (1-\beta) \nabla_{\bold w} C(\bold w_k) $$

$$ \bold w_{k+1} \leftarrow \bold w_k - \eta \bold v_k $$

where $\beta \in [0, 1)$ is the momentum coefficient.

$\bold v_k$ maintains a running average of the gradients, which helps to accelerate convergence and reduce oscillations.

2. Nesterov Accelerated Gradient (NAG):

$$ \bold v_k = \beta \bold v_{k-1} + \eta \nabla_{\bold w} C(\bold w_k - \eta \beta \bold v_{k-1}) $$

$$ \bold w_{k+1} \leftarrow \bold w_k - \bold v_k $$

NAG **looks ahead** by computing the gradient at the expected next position of the parameters, which can lead to faster convergence compared to standard momentum.

### Variation: Dataset Sampling

1. Batch Gradient Descent: Use the entire dataset to compute the gradient at each iteration.

Cons: computationally expensive for large datasets, may get stuck in local minima.

2. Stochastic Gradient Descent (SGD): Use **one** single randomly selected sample to compute the gradient at each iteration.

Cons: noisy updates, may not converge to the exact minimum.

3. Mini-batch Gradient Descent: Use a small random subset (mini-batch) of the dataset to compute the gradient at each iteration.

A balance between batch and stochastic gradient descent, which can lead to faster convergence and better generalization.

## Logistic Regression

Linear regression has some limitations when applied to classification tasks, in cases where the relationship between the features and the target variable is not linear, or data is not separable.

Logistic regression is a linear model for classification that uses the logistic function to model the **probability** of a binary outcome.

Given a sample $\bold x$ and the parameters $(\bold \theta, \theta_0)$, the logistic regression model is defined as:

$$ P[\hat y = 1 | \bold x; \bold \theta, \theta_0] = \sigma(\bold \theta^T \bold x + \theta_0) $$

where $\sigma(z) = \dfrac{1}{1 + e^{-z}}$ is the logistic/sigmoid function. Note that:

$$ 1 - \sigma(z) = \dfrac{e^{-z}}{1 + e^{-z}} = \sigma(-z) $$

@remark Why logistic function? {
    The log-odds of the probability can be expressed as a linear function of the features:
    
    $$ \log \dfrac{P[\hat y=1|\bold x]}{P[\hat y=-1|\bold x]} = \bold \theta^T \bold x + \theta_0 $$
    
    This is actually related to the softmax function, which is a generalization of the logistic function for multi-class classification (details will be shown later).
}

Now to estimate the parameters $(\bold \theta, \theta_0)$, we can use maximum likelihood estimation (MLE). Assume the samples are independent and identically distributed (i.i.d.), the likelihood of the dataset is:

$$ L(\bold \theta, \theta_0) = \prod_{i=1}^n P[\hat y_i = y_i | \bold x_i; \bold \theta, \theta_0] $$

$$
\begin{aligned}
& \quad \text{argmax}_{\bold \theta, \theta_0} \log L(\bold \theta, \theta_0) \\
&= \text{argmax}_{\bold \theta, \theta_0} \sum_{i=1}^n \log P[\hat y_i = y_i | \bold x_i; \bold \theta, \theta_0] \\
&= \text{argmin}_{\bold \theta, \theta_0} \sum_{i=1}^n \log \Big(1 + \exp[-y_i (\bold \theta^T \bold x_i + \theta_0)] \Big) \\ 
\end{aligned}
$$

---

@[Regularization]

With L2 regularization, the cost function becomes:

$$ J(\bold \theta, \theta_0) = \sum_{i=1}^n \log \Big(1 + \exp[-y_i (\bold \theta^T \bold x_i + \theta_0)] \Big) + \dfrac{1}{2}\lambda \|\bold \theta\|^2 $$

---

@[Multi-class Logistic Regression]

When we have $M \geq 2$ classes, we can use the softmax function to model the probabilities:

$$ P[y = c | \bold x, (\bold \theta_c, \theta_{0,c})] = \dfrac{\exp(\bold \theta_c^T \bold x + \theta_{0,c})}{\sum_{k=1}^M \exp(\bold \theta_k^T \bold x + \theta_{0,k})} $$

# 2. Linear Models for Classification

## Support Vector Machine (SVM)

### Margin and Linear Separability

Given a set of training samples $\{(\bold x_i, y_i)\}_{i=1}^N$ where $\bold x_i \in \mathbb{R}^d$ and $y_i \in \{-1, 1\}$, the goal of SVM is to find a hyperplane that best separates the two classes.

The decision boundary is a hyperplane defined by:

$$ f_{\bold \theta} = \text{sign} (\bold \theta^T \bold x ) $$

@def Margin of Classifier {
    The margin of a classifier $f_{\bold \theta}$ on sample $(\bold x, y)$ is defined as:
    
    $$y \cdot \bold \theta^T \bold x$$
    
    If the margin is positive, the sample is correctly classified.
}

@def Linear Separable {
    A dataset is linearly separable if there exists a hyperplane that can perfectly separate the two classes, i.e., there exists $\bold \theta$ such that:
    
    $$ y_i \cdot \bold \theta^T \bold x_i > 0, \quad \forall i $$
    
    A dataset is $\gamma$-separable if for some $\gamma > 0$, there exists $\bold \theta$ such that:
    
    $$ y_i \cdot \bold \theta^T \bold x_i \geq \gamma, \quad \forall i $$
}

Note that $\bold \theta$ can be scaled by any positive constant without changing the decision boundary, so $\gamma$-separability means the hyperplane strictly separates the two classes, regardless of $\gamma$.

@def Geometric Margin {
    The geometric margin of a classifier $f_{\bold \theta}$ on a dataset $D$ is defined as:
    
    $$ \gamma_{\text{geom}} = \dfrac{\gamma}{\|\bold \theta\|} = \dfrac{\min_i y_i \cdot \bold \theta^T \bold x_i}{\|\bold \theta\|} $$
    
    The geometric margin represents the distance from the sample to the decision boundary.
}

![alt text](image-1.png)

### Partial SVM

The SVM optimization problem can be formulated as:

$$ \max_{\bold \theta} \gamma_{\text{geom}} = \max \dfrac{\gamma}{\|\bold \theta\|} \Leftrightarrow \min_{\bold \theta} \dfrac{\|\bold \theta\|}{\gamma}, \text{ s.t. } y_i \bold \theta^T \bold x_i \geq \gamma, \quad \forall i $$

Take $\bold \theta' = \frac{\bold \theta}{\gamma}$, we have:

$$ \min_{\bold \theta'} \|\bold \theta'\|, \text{ s.t. } y_i \bold \theta'^T \bold x_i \geq 1, \quad \forall i $$

Since this is hard to optimize, we consider another formulation:

@model Partial SVM {
    $$ \min_{\bold \theta} \dfrac{1}{2} \|\bold \theta\|^2, \text{ s.t. } y_i \bold \theta^T \bold x_i \geq 1, \quad \forall i $$
}

@prop The solution to Primal-SVM is unique.

@proof {
    Suppose there exists two optimal solutions $\bold \theta_1$ and $\bold \theta_2$ such that $\|\bold \theta_1\|^2 = \|\bold \theta_2\|^2$.
    
    Construct $\bold \theta = \frac{1}{2} (\bold \theta_1 + \bold \theta_2)$, then:
    
    $$ y_i \bold \theta^T \bold x_i = y_i \left( \dfrac{1}{2} \bold \theta_1^T \bold x_i + \dfrac{1}{2} \bold \theta_2^T \bold x_i \right) = \dfrac{1}{2} y_i \bold \theta_1^T \bold x_i + \dfrac{1}{2} y_i \bold \theta_2^T \bold x_i \geq 1, \quad \forall i $$
    
    Thus $\bold \theta$ is also a feasible solution. However, by the triangle inequality, we have:
    
    $$ \|\bold \theta\|^2 = \left\| \dfrac{1}{2} (\bold \theta_1 + \bold \theta_2) \right\|^2 \leq \| \bold \theta_1\|^2 = \| \bold \theta_2\|^2 $$
    
    When the equality holds, $\bold \theta_1$ and $\bold \theta_2$ must be the same vector,w which contradicts the assumption that they are different. Therefore, the solution to Primal-SVM is unique.
}

#### Offset and Slack

Previously, we have assumed that the decision boundary passes through the origin. To allow for an offset, we can introduce a bias term $\theta_0$.

The naive SVM formulation only works for linearly separable data. To handle non-separable data, we may allow some misclassifications by introducing slack variables $\xi_i$:

$$ \min_{\bold \theta, \xi} \dfrac{1}{2} \|\bold \theta\|^2 + C \sum_{i=1}^N \xi_i, \text{ s.t. } y_i (\bold \theta^T \bold x_i + \theta_0) \geq 1 - \xi_i, \quad \xi_i \geq 0, \quad \forall i $$

Equivalent to:

$$ \min_{\bold \theta} \dfrac{1}{2} \|\bold \theta\|^2 + C \sum_{i=1}^N \max\{0, 1 - y_i (\bold \theta^T \bold x_i + \theta_0)\} $$

where $C$ is a hyperparameter that controls the trade-off between maximizing the margin and minimizing the classification error.

![alt text](image-2.png)

#### LOOCV

Leave-One-Out Cross-Validation (LOOCV) is a method for evaluating the robustness of a model.

$$ \text{LOOCV} = \dfrac{1}{n} \sum_{i=1}^n \text{Loss}(y_i, f_{\bold x_i, (\bold \theta_{-i}, \theta_{0,-i})}) $$

where $\bold \theta_{-i}$ and $\theta_{0,-i}$ are the parameters learned from the dataset excluding the $i$-th sample. The loss function is typically the 0-1 loss for classification tasks: $\text{Loss}(y, \hat y) = \mathbb{I}[y \neq \hat y]$.

The smaller the LOOCV error, the more robust the model is to outliers.

@prop {
    For linearly separable data, let the number of support vectors be $s$, then the LOOCV error of SVM is at most $\dfrac{s}{n}$.
}

@proof {
    For any sample that is not a support vector, removing it from the training set does not change the decision boundary. 
    
    For support vector $\bold x_t$, 
    
    $$\text{Loss}(y_t, f_{\bold x_t, (\bold \theta_{-t}, \theta_{0,-t})}) \leq 1$$
    
    Thus, the total LOOCV error is at most $\dfrac{s}{n}$.
}

## Model Evaluation and Regularization

A supervised learning model can be formulated as:

- Unknown target function $f: \mathcal{X} \to \mathcal{Y}$.
- Training set $D = \{(\bold x_i, y_i)\}_{i=1}^N$.
- Hypothesis space $\mathcal{H}$ (a set of candidate functions).
- Learning algorithm $\mathcal{A}$ that takes $D$ and $\mathcal{H}$ as input and outputs a function $h \in \mathcal{H}$.
- Final hypothesis $g: \mathcal{X} \to \mathcal{Y}$. (The generated model trained on $D$)

To evaluate the performance of the model, an error metric is defined as a function $\text{Err}: \mathcal{Y} \times \mathcal{Y} \to \mathbb{R}$, which measures the discrepancy between the predicted output and the true output.

For regression:

- Square error: $\text{Err}(y, \hat y) = (y - \hat y)^2$
- Absolute error: $\text{Err}(y, \hat y) = |y - \hat y|$

For classification:

- 0-1 loss (misclassification error): $\text{Err}(y, \hat y) = \mathbb{I}[y \neq \hat y]$
- Weighted 0-1 loss: $\text{Err}(y, \hat y) = \beta I[y = -1, \hat y = 1] + (1-\beta) I[y = 1, \hat y = -1]$ for some $\beta \in [0, 1]$.
- Balanced error rate: If dataset contains $n_+$ positive samples and $n_-$ negative samples, then the balanced error rate is defined as:
    
$$ \text{BER} = \dfrac{1}{2} \left( \dfrac{\text{FP}}{n_-} + \dfrac{\text{FN}}{n_+} \right) = \dfrac{1}{2} \left( \dfrac{\text{FP}}{\text{FP} + \text{TN}} + \dfrac{\text{FN}}{\text{TP} + \text{FN}} \right) $$

### Confusion Matrix

![alt text](image-3.png)

$$ \text{Precision} = \dfrac{\text{TP}}{\text{TP} + \text{FP}} $$

Precision measures *how many of the predicted positive samples are actually positive*.

$$ \text{Accuracy} = \dfrac{\text{TP} + \text{TN}}{\text{TP} + \text{FP} + \text{TN} + \text{FN}} = \dfrac{\text{TP} + \text{TN}}{n} $$

Accuracy measures *how many samples are correctly classified in total*.

$$ \text{Recall} = \dfrac{\text{TP}}{\text{TP} + \text{FN}} $$

Recall measures *how many of the actual positive samples are correctly predicted*. Also known as **sensitivity** or **true positive rate (TPR)**.

$$ \text{Specificity} = \dfrac{\text{TN}}{\text{TN} + \text{FP}} $$

Specificity measures *how many of the actual negative samples are correctly predicted*. Also known as **true negative rate (TNR)**.

$$ \text{F1 Score} = \dfrac{2}{\text{Recall}^{-1} + \text{Precision}^{-1}} $$

The F1 score is the harmonic mean of precision and recall, which balances the two metrics.

---

@def ROC Curve: Receiver Operating Characteristic, a plot of TPR vs FPR at different classification thresholds.

@def AUC: Area Under the ROC Curve, a single scalar value that summarizes the performance of a classifier across all thresholds. A higher AUC indicates better performance.

![alt text](image-4.png)

### Regularization

The expected error is composed of three parts:

$$ \text{Expected Error} = \text{Bias}^2 + \text{Variance} + \text{Noise} $$

- Bias: the error due to the model's assumptions. A high bias model may underfit the data.
- Variance: the error due to the model's sensitivity to the training data. A high variance model may overfit the data.
- Noise: the irreducible error due to the inherent randomness in the data.

There is no free lunch: a model with low bias may have high variance, and a model with low variance may have high bias. The goal of regularization is to find a good balance (sweet spot) between bias and variance to minimize the expected error.

---

The $l_p$ norm of a vector $\bold w$ is defined as:

$$ \|\bold w\|_p = \left( \sum_{i=1}^d |w_i|^p \right)^{\frac{1}{p}} $$

$$ \|\bold w\|_0 = \lim_{p \to 0} \|\bold w\|_p = \sum_{i=1}^d [w_i \neq 0] $$

$$ \|\bold w\|_{\infty} = \lim_{p \to \infty} \|\bold w\|_p = \max_{i} |w_i| $$

## Ensemble Methods

### Decision Tree

Decision tree is a non-parametric supervised learning method used for classification and regression tasks.

It works by recursively partitioning the feature space into subsets based on the values of the input features, creating a tree-like structure. Each internal node of the tree represents a decision based on a feature, and each leaf node represents a class label.

@alg Building a Decision Tree {
    Given a subset of data $M$,
    
    1. For each feature $h_i(x)$, split the data according to feature $h_i$ and compute the impurity and classification error of the split.
    2. Choose the feature $h^*$ that minimizes the impurity and classification error, and split the data according to $h^*$.
    3. Repeat the above steps recursively on the descendants until a stopping condition is met.
}

Stopping conditions can include:

- Purity: All samples in the node belong to the same class.
- Max depth: The depth of the tree exceeds a predefined limit.
- Min samples: The number of samples in the node is less than a predefined threshold.

### Majority Voting Ensemble

Consider a binary classification task. If we have $N$ independent base learners and the error rate of each base learner is $\epsilon < 0.5$, then the error rate of the ensemble model (majority vote) can be computed as:

$$ \text{Err} = \sum_{k=0}^{\lceil N/2 \rceil} \binom{N}{k} (1-\epsilon)^k \epsilon^{N-k} \leq \exp\left( -\dfrac{N}{2} (1 - 2\epsilon)^2 \right) $$

@proof {
    @lemma Hoeffding's Inequality {
        Let $X_1, X_2, \ldots, X_N$ be independent random variables with $X_i \in [a,b]$. Then for $\delta > 0$,
        
        $$ P\left( \sum_{i=1}^N X_i - \sum_{i=1}^N \mathbb{E}[X_i] \geq -\delta \right) \leq \exp\left( -\dfrac{2\delta^2}{N(b-a)^2} \right) $$
    }
    
    Let $X_i = [\text{base learner } i \text{ is correct}]$, then $X_i \sim B(1-\epsilon)$, $a=0, b=1$. Apply Hoeffding's inequality gives:
    
    $$ P(X - N(1-\epsilon) \geq -\delta) \leq \exp(-2 \delta^2/N) $$
    
    We assign $N(1-\epsilon)-\delta = N/2 \Rightarrow \delta = N(1/2 - \epsilon)$, then:
    
    $$ P(X \geq N/2) \leq \exp(-2 N (1/2 - \epsilon)^2) = \exp(-1/2 N (1 - 2\epsilon)^2) $$
}

Note that when $\epsilon < 0.5$, the error rate of the ensemble model decreases exponentially as $N$ increases. When $\epsilon > 0.5$, the error rate of the ensemble model increases exponentially as $N$ increases. 

### Bagging (Bootstrap Aggregating)

- Bootstrap sampling: Randomly sample $N$ samples with replacement from the original dataset (to get different training sets)

The generated bootstrap samples is the same size as the original dataset, but some samples may be **duplicated** while others may be left out.

When $N$ is large, the ratio of unique samples in the bootstrap sample is approximately:

$$ 1 - \lim_{N \to \infty} (1 - 1/N)^N = 1 - e^{-1} \approx 0.632 $$

- Bootstrap aggregation: Train a base learner on each bootstrap sample and aggregate their predictions (to reduce variance)

Train one model on each bootstrap sample, and the final prediction is obtained by majority voting for classification or averaging for regression.

---

#### Out-of-Bag Estimation

Each bootstrap sample leaves out about 36.8% of the original samples called out-of-bag (OOB) samples. We can use these OOB samples to estimate the generalization error without a separate validation set.

The OOB error can be computed as:

1. For each training sample $x_i$, find the set of base learners that did not include $x_i$ in their bootstrap sample.
2. Use these base learners to predict the label of $x_i$ and compare it with the true label to compute the error.
3. Average the errors over all training samples to get the OOB error estimate.

#### Variance Reduction and Bias

Bagging reduces the variance by averaging the predictions of multiple base learners.

If all the results of the base learners are i.i.d. with variance $\sigma^2$, then the variance of the ensemble model is:

$$ Var[\bar X] = \dfrac{1}{B^2} \cdot B \sigma^2 = \dfrac{\sigma^2}{B} $$

However, correlated learners cannot reduce variance as effectively. For example, assume the correlation between any two base learners is $\rho$, then the variance of the ensemble model is:

$$ Var[\bar X] = \dfrac{1}{B^2} \Big[ \sum\limits_{i=1}^B Var[X_i] + \sum\limits_{i \neq j} Cov[X_i, X_j] \Big] = \dfrac{1}{B^2} \Big[ B \sigma^2 + B(B-1) \rho \sigma^2 \Big] $$

which approaches $\rho \sigma^2$ as $B$ increases.

---

However, bagging does not reduce the bias.

@thm Decomposition of Squared Error {
     
     Denote $g$ as the target function and $\hat f$ as the predicted function of the model, then the squared error can be decomposed as:

    $$ E[(g - \hat f)^2] = E[(g - E \hat f + E \hat f - \hat f)^2] = (g - E \hat f)^2 + E[(E \hat f - \hat f)^2] $$
    
    Thus the expected squared error is the sum of the squared bias and the variance.
}

The first term is the bias, which is the error due to the model's assumptions. The second term is the variance, which is the error due to the model's sensitivity to the training data.

Bagging can reduce the variance by averaging the predictions of multiple base learners, but it **does not affect the bias**.

### Random Forest

Decision trees are unstable base learners, and different bootstrap samples can lead to very different trees. We hope the base learners to be:

- Accurate: keep low bias for each tree, although they may have high variance.
- Diverse: have low correlation between trees, which can reduce the variance of the ensemble.

Random forest is an extension of bagging that introduces additional randomness to the tree-building process to increase diversity among the trees. It simply selects a random subset of $k<m$ features at each split and chooses the best split among those features.

@model Random Forest {
    For each tree in the random forest:
    
    1. Generate a bootstrap sample from the original dataset.
    2. Build a decision tree using the bootstrap sample, but at each split, only consider a random subset of $k$ features from the full set of $m$ features.
    3. Repeat until the stopping condition is met (e.g., max depth, min samples).
    
    The final prediction is obtained by aggregating the predictions of all trees (majority voting for classification or averaging for regression).
}

There are many hyperparameters to tune: number of features $k$, number of trees $B$, max depth, min samples per leaf, etc. 

### Boosting

Boosting is another ensemble method that sequentially trains base learners, where each learner focuses on correcting the mistakes of the previous learners.

Let $T_h$ be the $h$-th base learner, and $\lambda_h$ be the weight assigned to $T_h$. The final prediction of the ensemble model is:

$$ T = \sum_{h=1}^H \lambda_h T_h $$

#### Gradient Boosting

Gradient boosting is a general method using gradient descent and works with any differentiable loss function. The idea is to fit the base learners to correct the mistakes of the previous learners by either minimizing the **residuals** or the **gradients** of the loss function.

@alg Gradient Boosting for squared error {
    1. Fit a simple model $T_0$ on the training data $D$ and compute the residuals $r_i = y_i - T_0(\bold x_i)$.
    2. For $h = 1$ to $H$:
    
        a. Fit a base learner $T_h$ to the residuals $r_i$.
        
        b. Update the residuals: $r_i \leftarrow r_i - \lambda_h T_h(\bold x_i)$, where $\lambda_h$ is the learning rate.
    3. The final model is $T = \sum_{h=0}^H \lambda_h T_h$.
}

@note For squared error, fitting the base learner to the residuals is equivalent to fitting it to the negative gradients of the loss function.

---

For more general loss functions, fitting the base learner to the negative gradients is better. This guides the base learner to step in the correct direction to minimize the loss.

In this case, $\lambda$ should be carefully tuned to ensure convergence and prevent overfitting. Generally, the learning rate should relate to the magnitude of the gradients: 

- Around the optimum, the gradients are small, so a smaller learning rate is needed to avoid overshooting;
- Far from the optimum, the gradients are large, so a larger learning rate can help to speed up convergence.

#### AdaBoost

For classification tasks, the loss function is typically not differentiable.

AdaBoost is a specific boosting algorithm for classification that adopts an exponential loss function:

$$ L(\bold y, \hat{\bold y}) = \dfrac{1}{N} \sum_{i=1}^N \exp(-y_i \hat y_i), y_i \in \{-1, 1\} $$

The gradient of the loss function with respect to the predictions is:

$$ \dfrac{\partial L}{\partial \hat y_i} = -\dfrac{1}{N} y_i \exp(-y_i \hat y_i) $$

@alg AdaBoost {
    1. Initialize the weights of the training samples: $w_i = \frac{1}{N}$ for $i=1,2,\ldots,N$.
    2. For $h = 1$ to $H$:  
        a. Fit a base learner $T_h$ to the training data with weights $w_i$.  
        b. Compute the weighted error of $T_h$ as $\epsilon_h$. If $\epsilon_h > 0.5$, terminate the algorithm.  
        c. Compute the weight of the base learner: $\lambda_h = \frac{1}{2} \ln\left( \frac{1 - \epsilon_h}{\epsilon_h} \right)$.  
        d. Update the weights of the training samples: $w_i \leftarrow w_i \exp(-\lambda_h y_i T_h(\bold x_i))$ for $i=1,2,\ldots,N$.
    3. The final model is $T = \sum_{h=1}^H \lambda_h T_h$.
}

# 3. Clustering

## Clustering Metrics

@problem Clustering {
    Given a set of data points $D = \{\bold x_i\}_{i=1}^N$, the goal of clustering is to partition the data into $K$ clusters such that data points in the same cluster are more similar to each other than to those in different clusters.
    
    A partition of $D$ is a collection of disjoint subsets $\Delta = \{C_1, C_2, \ldots, C_K\}$.
}

How to evaluate the quality of a clustering result? There are external and internal error metrics.

- External metrics: use external information (e.g., ground truth labels), measure how well the clustering result matches the true labels.

- Internal metrics: do not use external information, measure the compactness and separation of the clusters.

---

However, unlike supervised learning tasks (e.g., classification and regression), metrics for clustering are not used to optimize the model because:

1. Clustering is an unsupervised learning task, and there is no ground truth to compare against. The goal of clustering is to find natural groupings in the data.
2. Most metrics are discrete or non-differentiable, which makes them unsuitable for optimization.
3. Many clustering metrics are computationally expensive to compute.

Metrics serve as evaluation tools to compare different clustering results, but they are not used as objective functions for training the clustering model.

### External Metrics

@[Purity]

@def Purity {
    Purity is an external metric that measures the extent to which clusters contain a single class. It is defined as:
    
    $$ \text{Purity} = \dfrac{1}{N} \sum_{k=1}^K \max_j |C_k \cap L_j| $$
    
    where $C_k$ is the set of data points in cluster $k$, and $L_j$ is the set of data points with true label $j$.
}

Purity measures the accuracy of the clustering result, but it does not penalize for overclustering. A partition with each data point in its own cluster will have a purity of 1; and any partition has a purity of at least $\frac{1}{K}$.

---

@[Rand Index (RI)]

@def Rand Index {
    Rand Index is an external metric that measures the fraction of correct pairs.
    
    For a sample $(x_i, x_j)$, consider their clustering labels $c_i, c_j$ and their true labels $l_i, l_j$. There are four cases:
    
    - True Positive (TP): $c_i = c_j$ and $l_i = l_j$
    - True Negative (TN): $c_i \neq c_j$ and $l_i \neq l_j$
    - False Positive (FP): $c_i = c_j$ and $l_i \neq l_j$
    - False Negative (FN): $c_i \neq c_j$ and $l_i = l_j$
    
    $$ \text{RI} = \dfrac{\text{TP} + \text{TN}}{\text{TP} + \text{TN} + \text{FP} + \text{FN}} = \dfrac{\text{TP} + \text{TN}}{\binom{N}{2}} $$
    
    This is the **accuracy** of the clustering result.
}

Pros: punish over-clustering, since it will increase the number of false negatives.

Cons: does not consider chance agreement between two clusters. A random clustering can still have a high RI, especially when the number of clusters is large.

---

@[Adjusted Rand Index (ARI)]

This issue is addressed by the Adjusted Rand Index (ARI), which adjusts the RI by subtracting the expected RI of random clusterings and normalizing by the maximum possible RI:

@def Adjusted Rand Index {
    $$ \text{ARI} = \dfrac{\text{RI} - \mathbb{E}[\text{RI}]}{\max(\text{RI}) - \mathbb{E}[\text{RI}]} $$
    
    where $\mathbb{E}[\text{RI}]$ is the expected RI of random clusterings, and $\max(\text{RI})$ is the maximum possible RI (which is 1).
}

The range of ARI is $[-1, 1]$, where 1 indicates perfect clustering, 0 indicates random clustering, and negative values indicate worse than random clustering.

Genrally, ARI can be computed using the contingency table:

$$ \text{ARI} = \dfrac{\sum_{ij} \binom{n_{ij}}{2} - \left[ \sum_i \binom{n_{i+}}{2} \sum_j \binom{n_{+j}}{2} \right] / \binom{N}{2}}{\frac{1}{2} \left[ \sum_i \binom{n_{i+}}{2} + \sum_j \binom{n_{+j}}{2} \right] - \left[ \sum_i \binom{n_{i+}}{2} \sum_j \binom{n_{+j}}{2} \right] / \binom{N}{2}} $$

![alt text](image-5.png)

---

@[Fowlkes-Mallows Index (FMI)]

@def Fowlkes-Mallows Index {
    FMI is an external metric that measures the geometric mean of precision and recall:
    
    $$ \text{FMI} = \sqrt{\text{Precision} \cdot \text{Recall}} $$
}

---

@[Normalized Mutual Information (NMI)]

@def Normalized Mutual Information {
    NMI is an external metric that measures the mutual information between the clustering result and the true labels, normalized to account for the different sizes of the clusters and the true classes:
    
    $$ \text{NMI} = \dfrac{2 I(C; L)}{H(C)+H(L)} $$
    
    where $I(C; L)$ is the mutual information between the cluster labels $C$ and the true labels $L$, and $H(C)$ and $H(L)$ are the entropies of $C$ and $L$ respectively.
}

---

@[V-measure]

- @[Homogeneity]: Measures how pure each cluster is, i.e., whether all data points in a cluster belong to the same true class.

$$ \text{Homogeneity} = 1 - \dfrac{H(L|C)}{H(L)} $$

- @[Completeness]: Measures how well all data points of a true class are assigned to the same cluster.

$$ \text{Completeness} = 1 - \dfrac{H(C|L)}{H(C)} $$

@def V-measure {
    V-measure is the harmonic mean of homogeneity and completeness:
    
    $$ \text{V-measure} = \dfrac{2 \cdot \text{Homogeneity} \cdot \text{Completeness}}{\text{Homogeneity} + \text{Completeness}} $$
}

---

@summary External metrics {
    - Purity: measures the accuracy of the clustering result, but does not penalize for overclustering.
    
    Based on confusion matrix:
    - Rand Index (RI): measures the fraction of correct pairs, but does not consider chance agreement.
    - Adjusted Rand Index (ARI): adjusts RI by accounting for chance agreement, ranges from -1 to 1.
    - Fowlkes-Mallows Index (FMI): geometric mean of precision and recall, equivalent to F1 score.
    
    Based on entropy:
    - Normalized Mutual Information (NMI): measures mutual information between clustering and true labels, normalized by entropies.
    - V-measure: harmonic mean of homogeneity and completeness, balances purity and completeness.
}

### Internal Metrics

@[Silhouette Score]

Silhouette Score measures how similar a data point is to its own cluster compared to other clusters. It is defined as:

@def Silhouette Score {
    For a data point $\bold x_i$, denote:
    
    - $a(i)$: the average distance from $\bold x_i$ to all other points in the same cluster (intra-cluster distance).
    - $b(i)$: the minimum average distance from $\bold x_i$ to all points in any other cluster (nearest-cluster distance).
    
    The silhouette score for $\bold x_i$ is then defined as:
    
    $$
    s(i) = \dfrac{b(i) - a(i)}{\max\{a(i), b(i)\}} =
    \begin{cases}
    1 - a(i)/b(i), & a(i) < b(i) \\
    b(i)/a(i) - 1, & a(i) \geq b(i) \\
    \end{cases}
    $$
    
    The overall score is the average silhouette score over all data points.
}

The silhouette score ranges from $-1$ to $1$.

---

@[Calinski-Harabasz Index]

Calinski-Harabasz Index measures the ratio of between-cluster variance to within-cluster variance.

@def Calinski-Harabasz Index {
    Let $N$ be the total number of data points, $K$ be the number of clusters, $C_k$ be the set of data points in cluster $k$, and $\bold \mu_k$ be the mean of cluster $k$. The Calinski-Harabasz Index is defined as:
    
    $$ \text{CH} = \dfrac{\text{Between-cluster variance} / (K-1)}{\text{Within-cluster variance} / (N-K)} $$
    
    where:
    
    - Between-cluster variance: $\sum_{k=1}^K |C_k| \|\bold \mu_k - \bold \mu\|^2$, where $\bold \mu$ is the overall mean of the data.
    - Within-cluster variance: $\sum_{k=1}^K \sum_{\bold x_i \in C_k} \|\bold x_i - \bold \mu_k\|^2$.
}

---

@[Davies-Bouldin Index]

Davies-Bouldin Index measures the average similarity ratio of each cluster with its most similar cluster, where the similarity is defined as the ratio of within-cluster scatter to between-cluster separation.

@def Davies-Bouldin Index {
    Let the number of clusters be $K$, and:
    
    - Within-cluster scatter: For each cluster $C_k$, let $S_k$ be the average distance between each point in cluster $k$ and the centroid of cluster $k$.
    - Between-cluster separation: Let $d(C_i,C_j)$ be the distance between the centroids of clusters $i$ and $j$ (between-cluster separation).
    
    The Davies-Bouldin Index is defined as:
    
    $$ \text{DB} = \dfrac{1}{K} \sum_{i=1}^K \max_{j \neq i} \left( \dfrac{S_i + S_j}{d(C_i, C_j)} \right) $$
}

@remark Unlike other internal metrics, a **lower** Davies-Bouldin Index indicates better clustering performance.

---

@[Dunn Index]

Dunn Index measures the ratio of the minimum inter-cluster distance to the maximum intra-cluster distance.

@def Dunn Index {
    Let the number of clusters be $K$, and:
    
    - Intra-cluster distance: For each cluster $C_k$, let $\delta_k$ be the maximum distance between any two points in cluster $k$ (intra-cluster distance).
    - Inter-cluster distance: Let $\Delta(C_i, C_j)$ be the minimum distance between any two points from clusters $i$ and $j$ (inter-cluster distance).
    
    The Dunn Index is defined as:
    
    $$ \text{Dunn} = \dfrac{\min_{i \neq j} \Delta(C_i, C_j)}{\max_{1 \leq k \leq K} \delta_k} $$
}

Higher Dunn Index indicates larger inter-cluster separation (well-separated clusters) and smaller intra-cluster distance (compact clusters), thus better clustering performance.

However, Dunn Index is **sensitive to noise and outliers**, as they can significantly increase the maximum intra-cluster distance.

---

@summary Internal metrics {
    - Silhouette Score: measures how similar a data point is to its own cluster compared to other clusters, ranges from $-1$ to $1$.
    - Calinski-Harabasz Index: ratio of between-cluster variance to within-cluster variance, higher is better.
    - Davies-Bouldin Index: average similarity ratio of each cluster with its most similar cluster, lower is better.
    - Dunn Index: ratio of minimum inter-cluster distance to maximum intra-cluster distance, higher is better but sensitive to noise and outliers.
}

## Prototype-based methods

Prototype-based methods represent each cluster by a prototype (e.g., centroid, medoid) that summarizes the group. The clustering is performed by assigning each data point to the cluster with the closest prototype, optimizing a **distance-based objective function**.

### K-Means

@alg K-Means {
    Initialize $K$ centers $\{\bold \mu_1, \bold \mu_2, \ldots, \bold \mu_K\}$ (e.g., randomly select $K$ data points as initial centers).
    
    Repeat until convergence:
    
    1. Assign step: Assign each data point $\bold x_i$ to the nearest center:
    
    $$ r_i = \arg\min_{k} \|\bold x_i - \bold \mu_k\|^2 $$
    
    2. Update step: Update the centers by computing the mean of the assigned points:
    
    $$ \bold \mu_k = \dfrac{1}{|C_k|} \sum_{\bold x_i \in C_k} \bold x_i $$
    
    where $C_k = \{\bold x_i \mid r_i = k\}$ is the set of points assigned to cluster $k$.
}

The cost function is defined as Within-cluster Sum of Squares (WCSS):

$$ L(\Delta) = \sum_{k=1}^K \sum_{\bold x_i \in C_k} \|\bold x_i - \bold \mu_k\|^2 $$

@prop The K-means algorithm decreases the cost $L(\Delta)$ at each iteration, and thus converges to a local minimum.

---

Common stop conditions include:

-  Maximum number of iterations reached.
-  Assignments no longer change (convergence).
-  The cost $L$ converges to a local minimum.

@[Pros and Cons]

Pros: Simple and fast, works well for spherical clusters.

Cons: Sensitive to initialization, not robust to noise and outliers, struggles with non-convex clusters.

#### Smart Initialization

K-means is sensitive to the initial centers. When $K$ is large, hitting all $K$ clusters with random initialization is almost impossible.

There are several strategies for smart initialization, such as:

- Fastest First Traversal: Simple greedy strategy to spread out centers
- K-means++: Probabilistic strategy to spread out centers (theoretically guarantees a good initialization)
- "K-log K" initialization: Try enough centers to hit all clusters with high probability

---

@[Fastest First Traversal]

1. Initialize $C$ as an empty set of centers.
2. Repeat $k$ times: find the data point $\bold x$ that is farthest from the nearest center in $C$, and add $\bold x$ to $C$:

$$ \bold x^* = \arg\max_{\bold x} \min_{\bold c \in C} d(\bold x, \bold c) $$

---

@[K-means++]

1. Randomly select the first center $\bold \mu_1$ from the data points.
2. Then, in each subsequent step:
    1. For each remaining point, compute the squared distance to the nearest chosen center: $D(\bold x) = \min_{\bold \mu \in C} \|\bold x - \bold \mu\|^2$.
    2. Select the next center $\bold \mu_k$ from the remaining points with probability proportional to $D(\bold x)$.

This probabilistic strategy encourages the selection of centers that are farther apart. It can be regarded as a randomized version of the Fastest First Traversal.

@prop {
    K-means++ gaurantees that the expected cost of the initial centers is at most $O(\log K)$ times the optimal cost.
    
    $$ E[L_{\text{K-means++}}] \leq 8(\ln K+2) \cdot L_{\text{optimal}} $$
}

---

@[K-log K Initialization]

Randomly select $O(K \log K)$ centers from the data points, and then run a few iterations of K-means to refine the centers.

### K-Medoids

K-medoids is similar to K-means, but it uses actual data points as centers (medoids) instead of the mean.

The cost function is defined as:

$$ L(\Delta) = \sum_{k=1}^K \sum_{\bold x_i \in C_k} d(\bold x_i, \bold m_k) $$

where $\bold m_k$ is the medoid of cluster $k$, defined as the point in $C_k$ that minimizes the sum of distances to all other points in $C_k$:

$$ m_k = \arg\min_{\bold x_j \in C_k} \sum_{\bold x_i \in C_k} d(\bold x_i, \bold x_j) $$

However, optimizing K-medoids is NP-hard, and thus we typically use heuristic algorithms.

### Kernel K-Means

For datasets that are not linearly separable, they can be mapped to a higher-dimensional feature space $x \mapsto \phi(x)$, where they may become linearly separable. However, this brings higher computational cost.

@[Kernel Trick]

In many cases, we only need to compute the inner product $\phi(x)^T \phi(y)$, which can be done efficiently using a kernel function $K(x,y)$ without explicitly computing $\phi(x)$.

Common kernel functions include:

- Linear kernel: $K(x,y) = x^T y$
- Polynomial kernel: $K(x,y) = (x^T y + c)^d$
- Radial Basis Function (RBF) kernel: $K(x,y) = \exp(-\gamma \|x-y\|^2)$
- Sigmoid kernel: $K(x,y) = \tanh(\alpha x^T y + c)$

---

For kernel K-means, we only care about the distance between points and centers without explicitly computing the centers.

To compute the distance between two points $\phi(x_i)$ and $\phi(x_j)$:

$$
\begin{aligned}
\|\phi(x_i) - \phi(x_j)\|^2
&= (\phi(x_i) - \phi(x_j))^T (\phi(x_i) - \phi(x_j)) \\
&= \phi(x_i)^T \phi(x_i) - 2 \phi(x_i)^T \phi(x_j) + \phi(x_j)^T \phi(x_j) \\
&= K(x_i, x_i) - 2 K(x_i, x_j) + K(x_j, x_j)
\end{aligned}
$$

To compute the distance between a point $\phi(x_i)$ and a cluster centroid $\bold \mu_k$:

$$
\begin{aligned}
\|\phi(x_i) - \bold \mu_k\|^2
&= \|\phi(x_i) - \dfrac{1}{|C_k|} \sum_{x_j \in C_k} \phi(x_j)\|^2 \
&= K(x_i, x_i) - \dfrac{2}{|C_k|} \sum_{x_j \in C_k} K(x_i, x_j) + \dfrac{1}{|C_k|^2} \sum_{x_j, x_l \in C_k} K(x_j, x_l)
\end{aligned}
$$

## Density-based Clustering

K-means and K-medoids require pre-scpecifying the number of clusters $K$. They also struggle with noise, outliers, and non-convex clusters.

Density-based clustering algorithms identify clusters as dense regions and noise/outliers as sparse regions. They can handle arbitary-shaped clusters and are robust to noise and outliers.

### DBSCAN

DBSCAN: Density-Based Spatial Clustering of Applications with Noise

- $\epsilon$-neighborhood: For a point $\bold x$, its $\epsilon$-neighborhood is defined as the set of points that are within a distance $\epsilon$ from $\bold x$:
    
    $$ N_{\epsilon}(\bold x) = \{\bold y \in D : d(\bold x, \bold y) \leq \epsilon\} $$

- Core point: Points with at least $MinPts$ points in their $\epsilon$-neighborhood (including itself).
- Border point: Points that are not core points but are within the $\epsilon$-neighborhood of a core point.
- Noise point: Points that are neither core points nor border points.

Also define the concept of density reachability:

- Directly density-reachable: A point $\bold y$ is directly density-reachable from a point $\bold x$ if $\bold y \in N_{\epsilon}(\bold x)$ and $\bold x$ is a core point.
- Density-reachable: A point $\bold y$ is density-reachable from a core point $\bold x$ if there exists a path from $\bold x$ to $\bold y$ consisting of core points (except for $\bold y$). 
- Density-connected: Two points $\bold x$ and $\bold y$ are density-connected if there exists a point $\bold z$ such that both $\bold x$ and $\bold y$ are density-reachable from $\bold z$.

@prop Partial Transitivity {
    Within core points, density-reachability forms an **equivalence relation**, as it is reflexive, symmetric, and transitive. 
    
    If core point $\bold y$ is density-reachable from core point $\bold x$, then for any point $\bold p$ and $\bold q$ that is density-reachable from either $\bold x$ or $\bold y$, $\bold p$ and $\bold q$ are density-connected.
}

Basic idea of DBSCAN: a cluster is a maximal set of density-connected points, that is:

- Connectivity: For any two points in the same cluster, they are density-connected.
- Maximality: If a point is density-connected to a point in the cluster, then it is also in the cluster, except for border points that may be assigned to multiple clusters.

@[Key idea]: Each cluster corresponds to an equivalence class of core points under the density-reachability relation; border points are assigned to the cluster of the core points they are density-reachable from; noise points are not assigned to any cluster.

@alg DBSCAN {
    For each point $\bold x$ in the dataset:
    
    1. Mark $\bold x$ as visited.
    2. If $\bold x$ is a not a core point, mark it as noise (temporarily) and continue to the next point.
    3. If $\bold x$ is a core point, create a new cluster and start a depth-first search (DFS) from $\bold x$ to find all points that are density-reachable, when exploring a point $\bold q$ during the DFS:
        1. If $\bold q$ is unvisited and is a core point, recursively perform DFS;
        2. If $\bold q$ is unvisited and is not a core point, mark it as border point and add it to the current cluster;
        3. If $\bold q$ is already visited and marked as noise, mark it as a border point and add it to the current cluster.
        4. If $\bold q$ is already visited and marked as border point, it can be assigned to either cluster (non-deterministically).
}

The proposition garantees that the connectivity condition is satisfied, and the maximality condition is also satisfied since we only add points that are density-reachable from the core point.

- Core points are deterministically assigned. Core points in the same equivalence class are assigned to the same cluster.
- Noise points are deterministically assigned. Points that are not density-reachable from any core point are marked as noise.
- Border points are **non-deterministically assigned**. A border point may be density-reachable from multiple core points in different clusters, and thus can be assigned to any of those clusters.

@[Pros and Cons]

Pros: Can find clusters of arbitrary shape, robust to noise and outliers, does not require pre-specifying the number of clusters.

Cons:
- Sensitive to the choice of $\epsilon$ and $MinPts$
- Curse of dimensionality: in high-dimensional spaces, the concept of neighborhood becomes less meaningful, and pairwise distances become less distinguishable

### OPTICS

OPTICS: Ordering Points To Identify the Clustering Structure

DBSCAN is sensitive to the choice of $\epsilon$ and $\texttt{MinPts}$, and cannot handle clusters with varying densities. 

OPTICS is an extension of DBSCAN that addresses these issues by creating an ordering of the data points based on their density reachability, and then extracting clusters from this ordering.

Hyperparameters of OPTICS include:

- Adaptive $\epsilon$: the maximum radius, can be set to $\infty$. A smaller $\epsilon$ can lead to more clusters and faster computation.
- $MinPts$: the minimum number of points required to form a dense region, same as DBSCAN.

Key ideas of OPTICS:

- Core distance: For a point $\bold x$, the core distance is the distance to its $MinPts$-th nearest neighbor. If $\bold x$ is not a core point, its core distance is undefined.

$$\text{cd}(\bold x) = \begin{cases} \text{distance to } MinPts\text{-th nearest neighbor}, & \text{if } \bold x \text{ is a core point} \\ \text{undefined}, & \text{otherwise} \end{cases}$$

- Reachability distance: For two points $\bold x$ and $\bold y$, the reachability distance is defined as the minimum distance to make $\bold x$ a core point that can reach $\bold y$.

$$ \text{rd}(\bold y, \bold x) = \max\{\text{cd}(\bold x), d(\bold x, \bold y)\} $$

- Reachability of a point $\bold x$ is the minimum reachability distance from any processed point to $\bold x$:

$$ r_{\bold x} = \min_{\bold y \text{ is processed }} \text{rd}(\bold x, \bold y) $$

@alg OPTICS {
    Initialize all points as unprocessed and set their reachability distance to $\infty$.
    
    For each unprocessed point $\bold x$:
    
    0. If $\text{cd}(\bold x)$ is undefined, mark $\bold x$ as processed (noise) and continue to the next point.
    1. Mark $\bold x$ as processed, add it to the ordering, and set its reachability distance to $\text{UDF}$.
    2. Initialize an empty priority queue $Q$. Update the points in the $\epsilon$-neighborhood of $\bold x$ by computing their reachability distance and adding them to $Q$.
    3. Repeat until $Q$ is empty:
        1. Pop the point $\bold y$ with the smallest reachability distance from $Q$.
        2. If $\bold y$ is unprocessed, mark $\bold y$ as processed, add it to the ordering, and update the reachability distance of its unprocessed neighbors.
}

OPTICS does not explicitly assign points to clusters. Instead, it produces an ordering of the data points based on their reachability distance, which can be visualized as a reachability plot. Each cluster is a "U" shape valley in the reachability plot.

Common methods to extract clusters:

- Reachability Plot: Visualize clusters by identifying valleys in the reachability plot.
- Xi Method: Detect clusters by finding significant drops (steepness) in the reachability distance.
- Cut-off Threshold: Set a reachability distance threshold to separate clusters from noise.

@[Pros and Cons]

Pros:
- Flexible: Detect clusters of varying densities and shapes without pre-specifying the number of clusters.
- Robust to noise and outliers.

Cons:
- Computationally expensive, especially for large datasets.
- Requires careful interpretation of the reachability plot to extract clusters.

## Hierarchical Clustering

Two approaches to hierarchical clustering:

- Agglomerative (bottom-up): Start with each data point as a separate cluster, and iteratively merge the closest clusters until only one cluster remains.
- Divisive (top-down): Start with all data points in one cluster, and iteratively split the cluster until each data point is in its own cluster.

### Agglomerative hierarchical clustering

@alg Agglomerative Hierarchical Clustering {
    1. Start with each data point as a separate cluster.
    2. Merge the two closest clusters based on a distance metric (e.g., single-linkage, complete-linkage, average-linkage).
    3. Repeat step 2 until only one cluster remains.
}

Common linkage methods:

- Single linkage: minimum pairwise distance. Tends to produce elongated clusters and is sensitive to noise.
- Complete linkage: maximum pairwise distance. Tends to produce compact clusters and is less sensitive to noise.
- Average linkage: average pairwise distance. Provides a balance between single and complete linkage.
- Ward's method: minimizes the increase in total within-cluster variance after merging. Efficient in minimizing intra-cluster variance and tends to produce compact clusters.

The cost of Ward's method is defined as the increase in total within-cluster variance after merging two clusters $C_i$ and $C_j$:

$$ \Delta(A,B) = \sum_{\bold x \in A \cup B} \|\bold x - \bold \mu_{A \cup B}\|^2 - \sum_{\bold x \in A} \|\bold x - \bold \mu_A\|^2 - \sum_{\bold x \in B} \|\bold x - \bold \mu_B\|^2 = \dfrac{2n_A n_B}{n_A + n_B} \|\bold \mu_A - \bold \mu_B\|^2 $$

### Divisive hierarchical clustering

@alg Divisive Hierarchical Clustering {
    1. Start with all data points in one cluster.
    2. Split the cluster into two subclusters based on a distance metric.
    3. Repeat step 2 for each subcluster until each data point is in its own cluster.
}

Divisive hierarchical clustering is less common than agglomerative clustering due to its **higher computational cost**, as it requires evaluating all possible splits at each step.

### Dendrogram

@[Dendrogram]: A tree-like diagram that records the sequence of merges or splits in hierarchical clustering. The height of each node represents the distance at which clusters are merged or split.

![alt text](image-6.png)

---

@[Pros and Cons]

Pros:
- Does not require pre-specifying the number of clusters.
- Provides a visual representation of the clustering structure through the dendrogram.

Cons:
- Computationally expensive, especially for large datasets.
- Sensitive to noise and outliers, which can affect the structure of the dendrogram.

# 4. Dimension Reduction

## Principal Component Analysis (PCA)

PCA is an unsupervised linear dimension reduction technique that finds the directions (principal components) that maximize the variance of the data.

### Variance and Reconstruction Error

To determine the principal components (axes), two viewpoints are equivalent:

- Maximize variance: Find the directions that maximize the variance of the projected data.
- Minimize reconstruction error: Find the directions that minimize the mean squared error between the original data and the reconstructed data from the projection.

Let the data matrix be $X \in \mathbb{R}^{n \times d}$ ($n$ samples, $d$ features) and the projection matrix be $U \in \mathbb{R}^{d \times k}$ containing $k$ orthonormal columns (principal components). The projected data is $Z = XU$, and the reconstructed data is $\hat X = ZU^T = XUU^T$.

By Pythagorean theorem, the reconstruction error can be decomposed as:

$$ \sum_{i=1}^n \|x_i - \hat x_i\|^2 = \sum_{i=1}^n \|x_i\|^2 - \|z_i\|^2 = \text{const} - \text{Variance}(Z) $$

Thus maximizing the variance of the projected data is equivalent to minimizing the reconstruction error.

### Variance Maximization

Consider projecting the data onto a single direction $\bold u$, which is a unit vector in $\mathbb{R}^d$. 

$$ Var(z) = Var(X\bold u) = \bold u^T \Sigma \bold u $$

where $\Sigma$ is the covariance matrix $\Sigma = \frac{1}{n} X^T X$.

The problem is formulated as:

$$ \max_{\bold u} \quad \bold u^T \Sigma \bold u \quad \text{subject to} \quad \|\bold u\|^2 = 1 $$

---

Recall that the eigenvalue decomposition of $\Sigma$ is $\Sigma = Q \Lambda Q^T$, where $Q$ is an orthonormal matrix of eigenvectors and $\Lambda$ is a diagonal matrix of eigenvalues. The variance can be rewritten as:

$$ \bold u^T \Sigma \bold u = \bold u^T Q \Lambda Q^T \bold u = (Q^T \bold u)^T \Lambda (Q^T \bold u) $$

Note that $\bold v = Q^T \bold u$ is still a unit vector, and the variance is a weighted sum of the eigenvalues:

$$ Var(z) = \sum_{i=1}^d \lambda_i v_i^2 \leq \lambda_1 \sum_{i=1}^d v_i^2 \leq \lambda_1 $$

When $\bold u$ is the eigenvector corresponding to the largest eigenvalue $\lambda_1$, $\bold v = Q^T \bold u$ has $v_1 = 1$ and $v_i = 0$ for $i > 1$, thus achieving the maximum variance of $\lambda_1$.

---

Similarly, if $\bold u$ is required to be orthogonal to the first $k-1$ principal components, then $v_1=v_2=\ldots=v_{k-1}=0$, and the variance is maximized when $\bold u$ is the eigenvector corresponding to the $k$-th largest eigenvalue $\lambda_k$.

Thus, if we are allowed to choose $k$ orthonormal directions, it is optimal to choose the top $k$ eigenvectors corresponding to the largest $k$ eigenvalues, which will capture the most variance in the data. The variance explained is:

$$ \dfrac{\sum_{i=1}^k \lambda_i}{\sum_{i=1}^d \lambda_i} $$

@alg PCA {
    Given a dataset of $n$ data points $\{\bold x_i\}_{i=1}^n$ in $\mathbb{R}^m$:
    
    1. Pre-process the data by subtracting the mean from $X$.
    2. Compute the covariance matrix $\Sigma = \frac{1}{n} X^T X$.
    3. Compute the eigenvalues and eigenvectors of the covariance matrix $\Sigma$.
    4. Sort the eigenvectors by their corresponding eigenvalues in descending order.
    5. Select the top $p$ eigenvectors to form the projection matrix $U \in \mathbb{R}^{m \times p}$.
    6. Project the original data onto the new subspace (basis): $Z = X U$.
}

@note PCA is sensitive to the scale of each feature. It is common to standardize the data (zero mean and unit variance) before applying PCA, especially when the features are on different scales.

### Kernel PCA

For non-linear data, the kernel trick can be applied to PCA to find non-linear principal components.

Using the inner products $K_{ij} = \phi(\bold x_i)^T \phi(\bold x_j)$ as the distance measure. $\Phi(X) = [\phi(\bold x_1), \phi(\bold x_2), \ldots, \phi(\bold x_n)]^T \in \mathbb{R}^{n \times d'} $ is the matrix of mapped data points. The covariance matrix becomes:

$$ \Sigma = \dfrac{1}{n} \Phi(X)^T \Phi(X) = \dfrac{1}{n} \sum_{i=1}^n \phi(\bold x_i) \phi(\bold x_i)^T $$
 
The eigenvectors should satisfy:

$$ \dfrac{1}{n} \sum_{i=1}^n \phi(\bold x_i) \phi(\bold x_i)^T \bold v = \lambda \bold v $$

Thus $\bold v$ is a linear combination of the mapped data points $\phi(\bold x_i)$:

$$ \bold v = \sum_{i=1}^n \beta_i \phi(\bold x_i) = \Phi(X)^T \bold \beta $$

Let $K_c = \Phi(X)^T \Phi(X)$ be the centered kernel matrix (filled with terms $K_{ij}$). The eigenvalue problem can be rewritten as:

$$ \text{LHS} = \dfrac{1}{n} \sum_{i=1}^n \phi(\bold x_i) \phi(\bold x_i)^T \sum_{j=1}^n \beta_j \phi(\bold x_j) = \dfrac{1}{n} \sum_{i=1}^n \phi(\bold x_i) \sum_{j=1}^n \beta_j K_{ij} = \dfrac{1}{n} \sum_{i=1}^n \phi(\bold x_i) (K_c \bold \beta)_i = \dfrac{1}{n} \Phi(X)^T K_c \bold \beta $$

$$ \text{RHS} = \lambda \sum_{j=1}^n \beta_j \phi(\bold x_j) = \lambda \Phi(X)^T \bold \beta $$

$$ \Rightarrow \dfrac{1}{n} K_c \bold \beta = \lambda \bold \beta $$

Thus, we can solve the eigenvalue problem for $K_c$ (in the kernel space) without explicitly computing the mapping $\phi(x)$.

### Conclusion

Pros:

- Linear method, simple and efficient.
- Can be extended to non-linear data using the kernel trick.

Cons:

- Assume linear relationships, may not capture complex structures in the data.
- Sensitive to outliers and noise
- Less effective for preserving local structure compared to non-linear methods.

## Multidimensional Scaling (MDS)

MDS is a non-linear dimension reduction technique that aims to preserve the pairwise distances between data points in the low-dimensional embedding.

- Classical MDS: Closed-form method for Euclidean distances, equivalent to PCA.
- Metric MDS: Iterative method that minimizes the stress function, can handle non-Euclidean distances.
- Non-metric MDS: Iterative method that minimizes the stress function based on rank order of distances.

### Classical MDS

Given a distance matrix $D \in \mathbb{R}^{n \times n}$ where $D_{ij}$ is the distance between data points $\bold x_i$ and $\bold x_j$, we want to find a low-dimensional embedding $Y \in \mathbb{R}^{n \times k}$ such that the distances in the embedding approximate the original distances.

The quality of the embedding can be measured by the strain function:

@def Strain Function {
    $$ \text{Strain}(Y) = \dfrac{\sum_{i=1}^n \sum_{j=1}^n (D_{ij} - \|y_i - y_j\|^2)^2}{\sum_{i=1}^n \sum_{j=1}^n D_{ij}^2} $$
}

Classical MDS provides a closed-form solution for the embedding when the distances are Euclidean. It includes two steps:

1. Double centering: Convert the distance matrix $D$ into a centered inner product matrix $B$.
2. Eigenvalue decomposition: Perform eigenvalue decomposition on $B$ to obtain the low-dimensional embedding.

#### Double Centering

Let $\bold x_1, x_2, \cdots, \bold x_n$ be a set of points in $\mathbb{R}^d$ that preserve the distances in $D$, i.e., $\|\bold x_i - \bold x_j\| = D_{ij}$. However, the solution is not unique, as we can translate or rotate the embedding without changing the distances. To remove this ambiguity, we can center the data and add the constraint that the embedding has zero mean:

$$ \sum_{i=1}^n \bold x_i = \bold 0 $$

Denote $B = XX^T$ as the kernel matrix, where $b_{ij} = \bold x_i^T \bold x_j$. The squared distance between $\bold x_i$ and $\bold x_j$ can be expressed in terms of the inner products:

$$ d_{ij}^2 = \|\bold x_i - \bold x_j\|^2 = \bold x_i^T \bold x_i + \bold x_j^T \bold x_j - 2 \bold x_i^T \bold x_j = b_{ii} + b_{jj} - 2 b_{ij} $$

Then, the sum of each row and column of $B$ is zero:

$$ \sum_{i=1}^n b_{ij} = (\sum_{i=1}^n \bold x_i^T) \bold x_j = 0 $$

$$ \sum_{j=1}^n b_{ij} = \bold x_i^T (\sum_{j=1}^n \bold x_j) = 0 $$

Then, the sum of all elements in $D^{(2)}$ can be expressed as:

$$ \sum_{i=1}^n d_{ij}^2 = \sum_{i=1}^n (b_{ii} + b_{jj} - 2 b_{ij}) = n b_{jj} + \sum_{i=1}^n b_{ii} = Tr(B) + n b_{jj} $$

$$ \sum_{i=1}^n \sum_{j=1}^n d_{ij}^2 = 2 n Tr(B) $$

Now, we can express $b_{ii}$ in terms of $D^{(2)}$:

$$ b_{jj} = \dfrac{1}{n} \sum_{i=1}^n d_{ij}^2 - \dfrac{1}{n} Tr(B) $$

$$ b_{ii} = \dfrac{1}{n} \sum_{j=1}^n d_{ij}^2 - \dfrac{1}{n} Tr(B) $$

Then we can rewrite the relationship $ d_{ij}^2 = b_{ii} + b_{jj} - 2 b_{ij}$ in matrix form:

$$ b_{ij} = -\dfrac{1}{2} (d_{ij}^2 - b_{ii} - b_{jj}) = -\dfrac{1}{2} (d_{ij}^2 - \dfrac{1}{n} \sum_{i=1}^n d_{ij}^2 - \dfrac{1}{n} \sum_{j=1}^n d_{ij}^2 + \dfrac{1}{n^2} \sum_{i=1}^n \sum_{j=1}^n d_{ij}^2) $$

Define $J$ as the centering matrix:

$$ J = I - \dfrac{1}{n} \bold 1 \bold 1^T $$

Then we can express $B$ in matrix form:

$$ J D^{(2)} J = D^{(2)} - \dfrac{1}{n} \bold 1 \bold 1^T D^{(2)} - \dfrac{1}{n} D^{(2)} \bold 1 \bold 1^T + \dfrac{1}{n^2} \bold 1 \bold 1^T D^{(2)} \bold 1 \bold 1^T = -2 B $$

$$ B = -\dfrac{1}{2} J D^{(2)} J $$

#### Eigenvalue Decomposition

Let the low-dimensional embedding be $Y = [\bold y_1, \bold y_2, \ldots, \bold y_n]^T \in \mathbb{R}^{n \times k}$. We aim to find $Y$ such that $YY^T \approx B$.

The problem is to minimize the Frobenius norm of the difference between $B$ and $YY^T$:

$$ \min_{Y} \|B - YY^T\|_F^2 = \min_{Y} \sum_{i=1}^n \sum_{j=1}^n (b_{ij} - \bold y_i^T \bold y_j)^2 $$          

Perform eigenvalue decomposition on $B$:

$$ B = E \Lambda E^T $$

where $E$ is the matrix of eigenvectors and $\Lambda$ is the diagonal matrix of eigenvalues. The low-dimensional embedding can be obtained by selecting the top $k$ eigenvectors corresponding to the largest $k$ eigenvalues:

$$ Y = E_k \Lambda_k^{1/2} $$

@note Relationship with PCA {
    When the distance matrix $D$ is derived from Euclidean distances, classical MDS is equivalent to PCA.
    
    PCA performs eigenvalue decomposition on the covariance matrix $\Sigma = \frac{1}{n} X^T X$, while classical MDS does that on the centered inner product matrix $B = X X^T$. The eigenvalues and eigenvectors of $\Sigma$ and $B$ are same (with constant scaling), thus yielding the same low-dimensional embedding.
}

---

@alg Classical MDS {
    Given a distance matrix $D \in \mathbb{R}^{n \times n}$:
    
    1. Compute the squared distance matrix $D^{(2)}$ where $D_{ij}^{(2)} = D_{ij}^2$.
    2. Compute the centered inner product matrix $B = -\dfrac{1}{2} J D^{(2)} J$, where $J = I - \dfrac{1}{n} \bold 1 \bold 1^T$ is the centering matrix.
    3. Perform eigenvalue decomposition on $B$ to obtain eigenvalues $\Lambda$ and eigenvectors $E$.
    4. Select the top $k$ eigenvectors corresponding to the largest $k$ eigenvalues to form the embedding: $Y = E_k \Lambda_k^{1/2}$.
    5. Obtain the low-dimensional representation of the data points as the rows of $Y$.
}

### Metric MDS

When the distances are non-Euclidean, classical MDS may not be applicable. Metric MDS is an iterative method that minimizes the stress function:

$$ \text{Stress}(Y) = \sqrt{\dfrac{\sum_{i=1}^n \sum_{j=1}^n (D_{ij} - \|y_i - y_j\|)^2}{\sum_{i<j} D_{ij}^2}} $$

There is no closed-form solution for metric MDS, and it typically uses an iterative optimization algorithm such as gradient descent or majorization to find the embedding that minimizes the stress function.

### Non-metric MDS

Non-metric MDS is an extension of metric MDS that focuses on preserving the rank order of distances rather than the actual distance values. It minimizes a stress function based on the rank order of distances, allowing for more flexibility in handling non-Euclidean data.

$$ \text{Stress}(Y, f) = \sqrt{\dfrac{\sum_{i=1}^n \sum_{j=1}^n (f(D_{ij}) - \|y_i - y_j\|)^2}{\sum_{i<j} f(D_{ij})^2}} $$

where $f$ is a **monotonic** transformation function that maps the original distances to a new scale, that is, $d_{ij} < d_{kl} \Leftrightarrow f(d_{ij}) < f(d_{kl})$.

The algorithm for non-metric MDS typically involves alternating optimization:

- Monotonic regression: Fix the embedding $Y$ and optimize the transformation function $f$ to best fit the rank order of distances.
- Embedding optimization: Fix the transformation function $f$ and optimize the embedding $Y$ to minimize the stress function.

### Conclusion

Pros:

- Preserves pairwise distances closely, which can capture the underlying structure of the data.
- Can handle non-Euclidean distances (metric and non-metric MDS).

Cons:

- Assume linear relationships
- Computationally expensive for large datasets
- Sensitive to noise and outliers

## Isomap

Euclidean distance used in MDS might not be suitable for samples on a **manifold** (a low-dimensional, non-linear subspace embedded in a high-dimensional space). Isomap is a **non-linear** dimension reduction technique that extends MDS by using geodesic distances instead of Euclidean distances.

@alg Isomap {
    1. Construct neighborhood graph: For each data point, connect it to its $k$ nearest neighbors (or all points within a radius $\epsilon$) to form a graph.
    2. Compute geodesic distances: Use shortest path algorithms (e.g., Dijkstra's or Floyd-Warshall) to compute the shortest path distances between all pairs of points in the graph.
    3. Apply MDS: Use classical MDS on the geodesic distance matrix to obtain the low-dimensional embedding.
}

@summary {
    @[Pros]

    - Can capture non-linear structures in the data by using geodesic distances.
    - Preserves the intrinsic geometry of the data manifold.

    @[Cons]

    - Sensitive to the choice of neighborhood size ($k$ or $\epsilon$).
    - Computationally expensive for large datasets due to the need to compute shortest paths.
    - May not perform well if the manifold is not well-sampled or if there are noise and outliers. 
}

## Linear Discriminant Analysis (LDA)

LDA is a **supervised** linear dimension reduction technique that finds the directions (linear discriminants) that maximize the separation between classes. How to leverage label information to find a better low-dimensional representation?

@idea Project data to low-dimensional space that maximizes the between-class variance and minimizes the within-class variance.

### Seperation for Two Classes

Assume we project the data into one-dimensional space using a projection vector $\bold v$. The projected data is $a_i = \bold v^T \bold x_i$.

- Maximizes the between-class variance: maximize the distance between the means of the projected classes:

$$ \mu_1 = \dfrac{1}{n_1} \sum_{i=1}^{n_1} a_i = \bold v^T \bold m_1 $$

$$ \mu_2 = \dfrac{1}{n_2} \sum_{i=1}^{n_2} a_i = \bold v^T \bold m_2 $$

$$ \text{Between-class variance} = (\mu_1 - \mu_2)^2 $$

In the matrix form:

$$ (\mu_1 - \mu_2)^2 = (\bold v^T \bold m_1 - \bold v^T \bold m_2)^2 = \bold v^T S_B \bold v $$

$$ S_b = (\bold m_1 - \bold m_2)(\bold m_1 - \bold m_2)^T $$

is the between-class scatter matrix.

---

- Minimizes the within-class variance: minimize the variance of the projected data within each class:

$$ s_1^2 = \dfrac{1}{n_1} \sum_{i=1}^{n_1} (a_i - \mu_1)^2 $$

$$ s_2^2 = \dfrac{1}{n_2} \sum_{i=1}^{n_2} (a_i - \mu_2)^2 $$

$$ \text{Within-class variance} = s_1^2 + s_2^2 $$

In the matrix form:

$$ s_1^2 = \sum_{i=1}^{n_1} (\bold v^T \bold x_i - \bold v^T \bold m_1)^2 = \bold v^T S_1 \bold v $$

$$ S_1 = \sum_{i=1}^{n_1} (\bold x_i - \bold m_1)(\bold x_i - \bold m_1)^T $$

is the within-class scatter matrix for class 1. The total within-class scatter matrix is $S_w = S_1 + S_2$.

---


The objective function of LDA is to maximize the ratio of between-class variance to within-class variance:

$$ \max \dfrac{(\mu_1 - \mu_2)^2}{s_1^2+s_2^2} = \dfrac{\bold v^T S_b \bold v}{\bold v^T S_w \bold v} $$

Since $S_w$ is symmetric, and it must be positive definite (otherwise the ratio is unbounded).

@note {
    When the number of features $d$ is larger than the number of samples $n$, $S_w$ is singular and thus not invertible. In this case, we can apply PCA to reduce the dimensionality to $n-1$ before applying LDA.
}

We can perform eigenvalue decomposition on $S_w$:

$$ S_w = P^T \Lambda P = Q^T Q $$

where $Q = \Lambda^{-1/2} P$ is invertible.

$$ \bold v^T S_w \bold v = \bold v^T Q^T Q \bold v = \|Q \bold v\|^2 $$

Define $\bold u = Q \bold v$, then the objective function can be rewritten as:

$$ \max \dfrac{\bold u^T Q^{-T} S_b Q^{-1} \bold u}{\bold u^T \bold u} $$

Define $\Sigma = Q^{-T} S_b Q^{-1}$, then the optimal $\bold u$ is the eigenvector corresponding to the largest eigenvalue of $\Sigma$, and the optimal projection vector is $\bold v = Q^{-1} \bold u$ as shown in [PCA](#principal-component-analysis-pca).

@remark {
    The second largest eigenvalue of $\Sigma$ is zero, since $S_b$ is a rank-1 matrix. Thus, it is only possible to find one projection vector that maximizes the separation between two classes.
}

### Multiple Classes

When there are $C \geq 3$ classes, we can measure the between-class variance by summing the squared distances between the mean of each class and the overall mean:

$$ \bold \mu = \dfrac{1}{n} \sum_{k=1}^C n_k \bold m_k $$

$$ \text{Between-class variance} = \sum_{k=1}^C n_k \|\bold m_k - \bold \mu\|^2 $$

$$ S_b = \sum_{k=1}^C n_k (\bold m_k - \bold \mu)(\bold m_k - \bold \mu)^T $$

---

The within-class variance is still measured by the total within-class scatter matrix $S_w = \sum_{k=1}^C S_k$.

Similar to the two-class case, the optimization problem can be derived to a generalized eigenvalue problem $S_b \bold v = \lambda S_w \bold v$. The optimal projection vectors are the eigenvectors corresponding to the top $C-1$ eigenvalues, since $S_b$ is a rank-$(C-1)$ matrix.

@alg LDA {
    Given a dataset of $n$ data points $D \in \mathbb{R}^{n \times d}$ with class labels $\{y_i\}_{i=1}^n$ where $y_i \in \{1, 2, \ldots, C\}$.
    
    1. Compute the mean of each class $\bold m_k$ and the overall mean $\bold \mu$.
    2. Compute the between-class scatter matrix $S_b$ and the within-class scatter matrix $S_w$.
    3. Solve the generalized eigenvalue problem $S_b \bold v = \lambda S_w \bold v$ to obtain the eigenvalues and eigenvectors.
    4. Project the data onto the subspace $Y = XV \in \mathbb{R}^{n \times (C-1)}$, where $V$ contains the eigenvectors corresponding to the top $C-1$ eigenvalues.
}

### From Inference Perspective

Take the assumption that the data from each class is generated from a Gaussian distribution with mean $\bold m_k$ and common covariance matrix $\Sigma$. The likelihood of a data point $\bold x$ belonging to class $k$ is:

$$ P(\bold x | Y=k) = \dfrac{1}{(2\pi)^{d/2} |\Sigma|^{1/2}} \exp\left(-\dfrac{1}{2} (\bold x - \bold m_k)^T \Sigma^{-1} (\bold x - \bold m_k)\right) $$

The log of posterior distribution is:

$$ \log L(Y=k | X=\bold x) = \log \pi_k -\dfrac{1}{2} (\bold x - \bold m_k)^T \Sigma^{-1} (\bold x - \bold m_k) + \text{Constant} $$
    
Now consider the decision boundary between class $k$ and class $l$:

$$ \log L(Y=k | X=\bold x) = \log L(Y=l | X=\bold x) $$

$$ \Rightarrow \log \pi_k -\dfrac{1}{2} (\bold x - \bold m_k)^T \Sigma^{-1} (\bold x - \bold m_k) = \log \pi_l -\dfrac{1}{2} (\bold x - \bold m_l)^T \Sigma^{-1} (\bold x - \bold m_l) $$

$$ \log \dfrac{\pi_k}{\pi_l} + \bold x^T \Sigma^{-1} (\bold m_k - \bold m_l) = \dfrac{1}{2} (\bold m_k^T \Sigma^{-1} \bold m_k - \bold m_l^T \Sigma^{-1} \bold m_l) = \dfrac{1}{2} (\bold m_k + \bold m_l)^T \Sigma^{-1} (\bold m_k - \bold m_l) $$

That is, project $\bold x$ onto the direction $\Sigma^{-1} (\bold m_k - \bold m_l)$ and compare it with the threshold $\dfrac{1}{2} (\bold m_k + \bold m_l)^T \Sigma^{-1} (\bold m_k - \bold m_l) - \log \dfrac{\pi_k}{\pi_l}$. This is a linear decision boundary.

Thus, LDA is equivalent to finding the projection that maximizes the separation between classes while assuming that the data from each class is generated from a Gaussian distribution with **common** covariance matrix.

@summary {
    @[Pros]
    
    - Effectively leverages label information to find a low-dimensional representation that maximizes class separation.
    
    @[Cons]
    
    - Only reduces dimensionality to at most $C-1$, where $C$ is the number of classes.
    - Assumes Gaussian-distributed data with **common** covariance matrix.
    - Assume linear decision boundaries, may not capture complex relationships between classes.
}

### Quadratic Discriminant Analysis (QDA)

QDA is an extension of LDA that allows for different covariance matrices for each class, thus relaxing the assumption of common covariance. The decision boundary in QDA is quadratic rather than linear.

Unlike LDA, QDA is not a dimensionality-reduction method, but a method that classifies data points by finding the maximum posterior probability.

## Stochastic Neighbor Embedding (SNE)

SNE is a non-linear dimension reduction technique that aims to preserve the local structure of the data by modeling the pairwise similarities as probabilities in both spaces. Nearby points receive higher probability mass and are emphasized more in the embedding.

### Classical SNE

@[High-dimensional Similarity]

The similarity for jumping from $\bold x_j$ to $\bold x_i$ in the original space is defined as:

$$ p_{j|i} = \dfrac{\exp(-\|\bold x_i - \bold x_j\|^2 / 2\sigma_i^2)}{\sum_{k \neq i} \exp(-\|\bold x_i - \bold x_k\|^2 / 2\sigma_i^2)}, p_{i|i}=0 $$

where $\sigma_i$ is the bandwidth parameter that controls the **local neighborhood size** for point $\bold x_i$.

---

@[Low-dimensional Similarity]

The similarity for jumping from $\bold y_j$ to $\bold y_i$ in the embedding space is defined as:

$$ q_{j|i} = \dfrac{\exp(-\|\bold y_i - \bold y_j\|^2)}{\sum_{k \neq i} \exp(-\|\bold y_i - \bold y_k\|^2)}, q_{i|i}=0 $$

---

The objective function of SNE is to minimize the KL divergence between the two distributions $P$ and $Q$:

$$ C = \sum_{i=1}^n KL(P_i || Q_i) = \sum_{i=1}^n \sum_{j=1}^n p_{j|i} \log \dfrac{p_{j|i}}{q_{j|i}} $$

The optimization is typically performed using gradient descent, and the gradients can be computed as:

$$ \dfrac{\partial C}{\partial \bold y_i} = 2 \sum_{j=1}^n (p_{j|i} - q_{j|i} + p_{i|j} - q_{i|j})(\bold y_i - \bold y_j) $$

@[Interpretation]

- Each sample $i$ can be viewed as a point that is connected with other samples $j$ via springs with strength $p_{j|i} + p_{i|j}$ in the original space and strength $q_{j|i} + q_{i|j}$ in the embedding space. The objective is to find an embedding that minimizes the difference between these two sets of spring strengths.
- Sample $i$ is pulled (or pushed) by a force proportional to the mismatch between the two distributions, and the direction of the force is determined by the relative positions of the samples in the embedding space.

---

@summary {
    @[Pros]

    - Preserves local structure by modeling pairwise similarities as probabilities.
    - Provide a **flexible** framework that can be extended to various similarity measures and optimization techniques.

    @[Cons]

    - Computationally expensive for large datasets.
    - Sensitive to perplexity (bandwidth parameter $\sigma_i$) parameter.
    - **Crowding problem**: Difficult to preserve both local and global structure in the embedding, leading to points being crowded together in the low-dimensional space.
}

### Symmetric SNE

The similarity $p_{i|j}$ and $q_{i|j}$ are asymmetric measure. To make the similarity symmetric, we can define a symmetric similarity measure:

- Choice 1: Modify the denominator to a 2D summation:

$$ p_{ij} = \dfrac{\exp(-\|\bold x_i - \bold x_j\|^2 / 2\sigma_i^2)}{\sum_{k=1}^n \sum_{l=1}^n \exp(-\|\bold x_k - \bold x_l\|^2 / 2\sigma_k^2)} $$

- Choice 2: Average the two asymmetric measures:

$$ p_{ij} = \dfrac{p_{j|i} + p_{i|j}}{2n} $$

This ensures that $\sum_j p_{ij} > 1/2n$, and the gradient is:

$$ \dfrac{\partial C}{\partial \bold y_i} = 4 \sum_{j=1}^n (p_{ij} - q_{ij})(\bold y_i - \bold y_j) $$

### t-SNE

The "crowding problem" is caused by the fact that the Gaussian distribution used in SNE has thin tails, which makes it difficult to preserve the distances between points that are far apart in the original space.

To address this issue, t-SNE uses a Student's t-distribution with one degree of freedom for the low-dimensional similarity measure.

Adopt the symmetric high-dimensional similarity:

$$ p_{ij} = \dfrac{p_{j|i} + p_{i|j}}{2n} $$

The low-dimensional similarity is modified to:

$$ q_{ij} = \dfrac{(1 + \|\bold y_i - \bold y_j\|^2)^{-1}}{\sum_{k=1}^n \sum_{l=1}^n (1 + \|\bold y_k - \bold y_l\|^2)^{-1}} $$

@remark Early Exaggeration{
    Early exaggeration is a trick for gradient descent that is commonly used in t-SNE.
    
    Basic idea: During the initial stages of optimization, multiply the high-dimensional similarities $p_{ij}$ by a constant factor to exaggerate the attractive forces between points that are close together in the original space.
    
    This helps to create more distinct clusters in the early stages of optimization, which can lead to better convergence and a more meaningful embedding.
}

@warn {
    Although t-SNE can produce more visually appealing embeddings, it is important to note that it may not always preserve the **global structure** of the data. Be cautious when interpreting the cluster sizes, distances between clusters, and the overall geometry of the embedding.
}

## Uniform Manifold Approximation and Projection (UMAP)

UMAP is a non-linear dimension reduction technique motivated by manifold and topological assumptions. It aims to preserve both local and global structure of the data by modeling the data as a fuzzy topological structure and optimizing a low-dimensional embedding that best represents this structure.

### Graph Construction

UMAP constructs a weighted k-neighbour graph.

- Identify $k$ nearest neighbors for each data point $\bold x_i$ as $N_k(\bold x_i)$.
- Compute the distance to the nearest neighbor $\rho_i = \min_{j \in N_k(\bold x_i)} d(\bold x_i, \bold x_j)$.
- Set $\sigma_i$ such that

$$ \sum_{\bold x_j \in N_k(\bold x_i)} \exp\left(-\dfrac{\max(0, d(\bold x_i, \bold x_j) - \rho_i)}{\sigma_i}\right) = \log_2(k) $$

- Construct asymmetric weighted graph $A$ as:

$$ v_{j|i} = \exp \Big(-[d(\bold x_i,\bold x_j)-\rho_i]/\sigma_i \Big) $$

- Construct Symmetric weighted graph $B$ as $v_{ij} = v_{i|j}+v_{j|i}-v_{i|j}v_{j|i}$ (or $B=A+A^T-A \circ A^T$).

### Optimization

In the embedding space, weight between two samples is defined as:

$$ w_{ij} = (1+ a \|\bold y_i-\bold y_j\|^{2b})^{-1} $$

The objective function is to minimize the cross entropy,

$$ C_{UMAP} = \sum_{i \neq j} \Big[ v_{ij} \log \dfrac{v_{ij}}{w_{ij}} + (1-v_{ij}) \log \dfrac{1-v_{ij}}{1-w_{ij}} \Big] $$

This can be optimized by iteratively applying attractive and repulsive forces between points alternatively:

- Attractive force: take derivative on the first term $v_{ij} \log (v_{ij}/w_{ij})$:

$$ -\dfrac{2ab \|\bold y_i-\bold y_j\|^{2b-2}}{1+ \|\bold y_i-\bold y_j\|^{2b}} w_{ij} (\bold y_i-\bold y_j) $$

- Repulsive force: take derivative on the second term $(1-v_{ij}) \log ((1-v_{ij})/(1-w_{ij}))$:

$$ \dfrac{2n}{(\epsilon + \|\bold y_i-\bold y_j\|^2)(1+ \|\bold y_i-\bold y_j\|^{2b})} (1-w_{ij}) (\bold y_i-\bold y_j) $$

@summary {
    @[Pros]

    - Preserves both local and global structure by modeling the data as a fuzzy topological structure.
    - Computationally efficient for large datasets compared to t-SNE.

    @[Cons]

    - Sensitive to the choice of hyperparameters (e.g., number of neighbors, minimum distance).
    - May overfit to noise in the data.
}

### Projecting New Data

A unique advantage of UMAP is that it can project new data points into the existing embedding space without retraining the entire model. 

@alg UMAP Projection {
    Given a new data point $\bold x_{new}$ and the existing embedding $Y$:
    
    1. Identify the $k$ nearest neighbors of $\bold x_{new}$ in the original space and compute the corresponding weights $v_{new|i}$.
    2. Use the weighted average of the embeddings $\sum_i w_i \bold y_i / \sum_i w_i$ as the initial position for $\bold y_{new}$ in the embedding space.
    3. Optionally, perform a few iterations of optimization to refine the position of $\bold y_{new}$ while fixing the existing embeddings $Y$.
}

## Summary

![alt text](image-10.png)

# 5. Probabilistic Graphical Models

@def Probabilistic Graphical Models (PGMs) {
    PGMs are a framework for representing and reasoning about complex probabilistic relationships among random variables using graphs. They provide a compact and intuitive way to model joint distributions, conditional independencies, and causal relationships.
    
    - Nodes: random variables (discrete or continuous).
    - Edges: probabilistic dependencies between variables.
    - Factors: conditional probability distributions associated with the edges or nodes, which specify how the variables are related.
}

Types of PGMs:
- Bayesian Networks (Directed Acyclic Graphs): Represent directed dependencies between variables.
- Markov Random Fields (Undirected Graphs): Represent undirected dependencies between variables.

## Bayesian Networks

For Bayesian Networks, the graph is a directed acyclic graph (DAG) and each RV is conditionally independent of its non-descendants given its parents.

For a chain structure constituted by three RVs $X, Y, Z$, there are three possible cases:

@[Head-to-Tail (Chain Structure)]

$$ X \rightarrow Y \rightarrow Z $$

$$ P(X, Y, Z) = P(X) P(Y|X) P(Z|Y) $$

This chain is Markovian as $P(Z|X, Y) = P(Z|Y)$.

@prop $X$ and $Z$ are conditionally independent given $Y$.

@proof {
    $$ P(X, Z|Y) = \dfrac{P(X, Y) P(Z|Y)}{P(Y)} = P(X|Y) P(Z|Y) $$
}

---

@[Tail-to-Tail (Common Cause)]

$$ X \leftarrow Y \rightarrow Z $$

$$ P(X, Y, Z) = P(Y) P(X|Y) P(Z|Y) $$

@prop $X$ and $Z$ are conditionally independent given $Y$.

---

@[Head-to-Head (Common effect, V-Structure)]

$$ X \rightarrow Y \leftarrow Z $$

$$ P(X, Y, Z) = P(X) P(Z) P(Y|X, Z) $$

@prop $X$ and $Z$ are marginally independent but conditionally dependent given $Y$.

### D-separation

@problem {
    Given a Bayesian Network, determine whether two sets of variables $A$ and $B$ are conditionally independent given a set of variables $C$.
}

This can be solved by checking the d-separation criterion:

@def D-separation {
    A path is blocked (inactive) by $C$ if:
    - There is a chain $i \rightarrow j \rightarrow k$ or a fork $i \leftarrow j \rightarrow k$ such that the middle node $j$ is in $C$.
    - There is a v-structure $i \rightarrow j \leftarrow k$ such that the middle node $j$ is not in $C$ and no descendant of $j$ is in $C$.
}

@thm {
    Two sets of variables $A$ and $B$ are conditionally independent given $C$ if all paths between any variable in $A$ and any variable in $B$ are blocked by $C$.
}

### Topic Modeling

Topic modeling is a stasitical model for discovering abstract topics that occur in a collection of documents.

There are $D$ documents, $K$ topics and a dictionary containing $d$ words.

- Each document is represented as a bag of words that is observed as a vector of word counts $\bold w \in \mathbb{N}^d$. 
- Each topic is represented as a distribution over words $\bold \phi \in \mathbb{R}^d$ where $\phi_j$ is the probability of word $j$ in the topic.
- Each document is generated by a mixture of topics, represented as a distribution over topics $\bold \theta \in \mathbb{R}^K$. Each word is generated by first sampling a topic from $\bold \theta$ and then sampling a word from the corresponding topic distribution $\bold \phi$.

The generative process for each document is as follows:

![alt text](image-7.png)

- $\beta$: Hyperparameter for the Dirichlet prior on the topic-word distributions.
- $\alpha$: Hyperparameter for the Dirichlet prior on the document-topic distributions.
- $z_{d,n}$: Topic assignment for the $n$-th word in document $d$.
- $w_{d,n}$: The $n$-th word in document $d$ (observed variable).

## Dynamic Bayesian Networks

Real-world systems often involve variables that evolve over time and have temporal dependencies. Dynamic Bayesian Networks (DBNs) are an extension of Bayesian Networks that can model temporal processes by representing the state of the system at different time steps.

### Hidden Markov Chain (HMM)

A Markov Chain is a simple DBN that models a sequence of random variables $\{X_t\}$ where the state at time $t+1$ depends only on the state at time $t$:

$$ P(X_{t+1} | X_t, X_{t-1}, \ldots, X_0) = P(X_{t+1} | X_t) $$

---

In many applications, the states of the system are not directly observable, and we only have access to noisy observations. This leads to the Hidden Markov Model (HMM), which consists of:

- Variables:
    - $X_t$: hidden state at time $t$ (unobserved).
    - $Z_t$: observation at time $t$ (observed).
- Transition model: $P(X_{t+1} | X_t)$, which describes how the hidden state evolves over time.
- Emission model: $P(Z_t | X_t)$, which describes how the observations are generated from the hidden states.

$$ P(X_{1:T}, Z_{1:T}) = P(X_1) \prod_{t=1}^{T-1} P(X_{t+1} | X_t) \prod_{t=1}^T P(Z_t | X_t) $$

### Markov Random Field (MRF)

Bayesian Networks are directed graphical models that represent causal relationships between variables. But in some cases, the relationships between variables are symmetric and cannot be easily represented by directed edges. 

Markov Random Fields (MRFs) are undirected graphical models that represent mutual dependencies between variables. It is modeled as an undirected graph $G=(V, E)$ where $V$ is the set of nodes (random variables) and $E$ is the set of edges (undirected dependencies).

@prop Markov property of MRF {
    A variable $X_i$ is conditionally independent of all other variables given its neighbors in the graph.
}

---

A clique is called a @[maximal clique] if it is not a subset of any other clique. The joint distribution of an MRF can be factorized over the maximal cliques by potential functions $\psi_C(X_C)$:

$$ P(X_{1:n}) = \dfrac{1}{Z} \prod_{C \in \mathcal{C}} \psi_C(X_C) $$

where $\mathcal{C}$ is the set of maximal cliques and $Z$ is normalization constant (partition function).

Usually, the potential functions are modeled as exponentials of energy functions:

$$ \psi_C(X_C) = \exp(-H_Q(X_Q)) $$

$$ H_C(X_C) = \sum_{i \in C} \theta_i X_i + \sum_{(i,j) \in C} \theta_{ij} X_i X_j $$


---

@[Markov Properties]

- Local Markov property: A variable is conditionally independent of all other variables given its neighbors.
- Global Markov property: If a set of variables $A$ is **separated** from another set of variables $B$ by a third set of variables $C$ in the graph, then $A$ is conditionally independent of $B$ given $C$.
- Pairwise Markov property: Non-adjacent variables are conditionally independent given **all other** variables. (special case of global Markov property)

### Conditional Random Field (CRF)

CRF is a special case of MRF that is used for modeling sequential data. It is an undirected graphical model that defines a conditional distribution over **output** variables given **input** variables.

Nodes in the graph are divided into two sets: input nodes (observations) $X$ and output variables (labels) $Y$. The edges represent dependencies between the output variables.

The conditional distribution obeys the Markov property:

$$ P(Y_v | X, Y_{V \setminus v}) = P(Y_v | X, Y_{N(v)}) $$

#### Linear-chain CRF

Linear-chain CRF is the simplest and most common type of CRF, where the output variables form a linear chain. It is often used for sequence labeling tasks such as part-of-speech tagging and named entity recognition.

The conditional distribution of a linear-chain CRF is defined as:

$$ P(y | x) = \dfrac{1}{Z(x)} \exp\left( \sum_k \sum_{i=1}^{n-1} \lambda_k t_k(y_{i+1}, y_i, x, i) + \sum_l \sum_{i=1}^n \mu_l s_l(y_i, x, i) \right) $$

- $t_k(y_{i+1}, y_i, x, i)$: transition feature function that captures the dependency between adjacent output variables.
- $s_l(y_i, x, i)$: state feature function that captures the dependency between the output variable and the input variables.
- $\lambda_k$ and $\mu_l$: parameters that need to be learned from the data.

![alt text](image-8.png)

### Factor Graph

A factor graph is a bipartite graph that represents the factorization of a probability distribution. It consists of:

- Variable nodes: representing random variables.
- Factor nodes: representing factors or potential functions.
- Edges: connecting variable nodes to factor nodes, representing dependencies between variables and factors.

For Bayesian Networks, each conditional probability distribution (incoming edges of a node) can be represented as a factor.

For Markov Random Fields, each potential function (associated with a clique) can be represented as a factor.

![alt text](image-9.png)

# 6. Reinforcement Learning

Reinforcement Learning: Sequential decision-making method in the field of artificial intelligence and machine learning.

Core: to simulate the human learning process, adjust behavior through **continuous interaction** with the environment and make autonomous decisions.

Key: balance between exploration and exploitation.

## Markov Decision Process (MDP)

@def Markov Decision Process (MDP) {
    An MDP is a mathematical framework for modeling decision-making problems where an agent interacts with an environment to achieve a goal. It consists of:
    
    - State space $S$: A set of all possible states the environment can be in.
    - Action space $A$: A set of all possible actions the agent can take.
    - Transition function $P(s' | s, a)$: The probability of transitioning to state $s'$ given that the agent takes action $a$ in state $s$.
    - Reward function $R(s, a, s')$: The immediate reward received after taking action $a$ in state $s$ and transitioning to $s'$.
    - Discount factor $\gamma$: A value between 0 and 1 that determines the importance of future rewards compared to immediate rewards.
    - A start state $s_0$ and optionally a set of terminal states $S_{terminal}$.
}

In deterministic single-agent search problems, the agent should be guided by an optimal plan or sequence of actions that leads to the goal state. The strategy is called a policy $\pi: S \rightarrow A$ that maps states to actions.

@def Policy {
    A policy $\pi: S \rightarrow A$ specifies which action to take in each state.
    
    - Deterministic policy: $\pi(s)$ returns a single action for each state.
    - Stochastic policy: $\pi(a | s)$ returns a probability distribution over actions for each state.
}

### Discounting and Infinite Utility

In many real-world scenarios, the agent may need to make decisions over an infinite horizon, where the number of time steps is not fixed. It may get infinite rewards if permitted to continue indefinitely. Solutions:

- Finite horizon: Terminate the process after a fixed number of time steps.
- Policy evaluation: Design nonstationary policies that depend on the time step.
- Discounting: Introduce a discount factor $\gamma$ to reduce the value of future rewards, ensuring that the total expected reward remains finite.

### Finite-horizon Optimal Policy

Suppose the agent has a finite horizon of $T$ time steps. The optimal policy can be found using dynamic programming by working backward from the last time step.

Let $V_t(s)$ be the maximum expected reward that can be obtained starting from state $s$ if the agent has $t$ time steps remaining. 

$$ V_0(s) = 0 $$

$$ V_t(s) = \max_{a \in A(s)} \sum_{s' \in S} P(s' | s, a) [R(s, a, s') + V_{t-1}(s')] $$

### Bellman Equation

What if the agent has an infinite horizon? Define:

- $V^{\pi}(s)$ as the expected total discounted reward when starting from state $s$ and following policy $\pi$;
- $Q^{\pi}(s, a)$ as the expected total discounted reward when starting from state $s$, taking action $a$, and then following policy $\pi$.

When $T \rightarrow \infty$, the optimal policy should stay stationary:

$$ V^{\pi}(s) = \max_{a \in A(s)} \sum_{s' \in S} P(s' | s, a) Q^{\pi}(s,a) = \max_{a \in A(s)} \sum_{s' \in S} P(s' | s, a) [R(s, a, s') + \gamma V^{\pi}(s')] $$

This is known as the @[Bellman optimality equation], which provides a recursive relationship for the optimal value function $V^{\pi}(s)$.

---

@[Policy Evaluation]

Given a policy $\pi$, we can compute the value function $V^{\pi}(s)$ by solving the following system of linear equations:

$$ V^{\pi}(s) = \sum_{a \in A(s)} \pi(a | s) \sum_{s' \in S} P(s' | s, a) [R(s, a, s') + \gamma V^{\pi}(s')] $$

This system can be solved efficiently to evaluate the expected return of the policy $\pi$ at the initial state $s_0$.

